import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { keccak256, toBytes } from "viem";
import type { LicenceCheckResult, LicenceCheckStatus } from "~~/services/licence-check/types";

const IAA_SEARCH_URL = "https://app.mbieregisters.govt.nz/iaa/ui/start/searchForAnOccupationalRegistration";
const IAA_PROFILE_URL = "https://app.mbieregisters.govt.nz/iaa/ext/adviser/view";
const IAA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const browserHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-NZ,en;q=0.9",
  "user-agent": IAA_USER_AGENT,
};

type IaaViewTreeNode = {
  id?: string;
  children?: string[];
  domain?: string;
  widget?: string;
  nodetype?: string;
  attribute?: string;
  attributeValue?: string;
  text?: {
    label?: string | null;
    dcText?: string | null;
    singleline?: string | null;
    readonlyValue?: string | null;
    "readonly-value"?: string | null;
  };
  kv?: Record<string, unknown>;
  dos?: string[];
};

type IaaSearchResponse = {
  state?: Record<string, IaaViewTreeNode>;
};

type SearchHit = {
  name: string;
  licenceNumber: string;
  status: LicenceCheckStatus;
};

const getDemoFallbackLicenceCheck = (query: string, checkedAt: string): LicenceCheckResult | null => {
  const normalisedQuery = normaliseSearchText(query);

  if (
    normalisedQuery === "josh morton" ||
    normalisedQuery === "joshua william morton" ||
    normalisedQuery === "202504487"
  ) {
    return {
      status: "licensed",
      licenceType: "Provisional",
      checkedAt,
      adviserName: "Joshua William Morton (Josh)",
      licenceRef: getLicenceRef("202504487"),
      canProceed: true,
      source: "demo_fallback",
    };
  }

  if (normalisedQuery === "not licensed adviser" || normalisedQuery === "unlicensed adviser") {
    return {
      status: "not_licensed",
      licenceType: null,
      checkedAt,
      adviserName: query.trim(),
      licenceRef: null,
      canProceed: false,
      source: "demo_fallback",
    };
  }

  return null;
};

const jsonHeaders = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "content-type": "application/json; charset=UTF-8",
  origin: "https://app.mbieregisters.govt.nz",
  referer: IAA_SEARCH_URL,
  "x-requested-with": "XMLHttpRequest",
};

const execFileAsync = promisify(execFile);

export const normaliseSearchText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export const getLicenceRef = (licenceNumber: string) => keccak256(toBytes(licenceNumber.trim()));

export const getNegativeLookupRef = (query: string) => keccak256(toBytes(`not-licensed:${normaliseSearchText(query)}`));

const htmlDecode = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractBalancedJsonObject = (html: string, marker: string) => {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index++) {
    const char = html[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      return html.slice(start, index + 1);
    }
  }

  return null;
};

const parseViewTree = (html: string) => {
  const json = extractBalancedJsonObject(html, "var viewTree =");
  if (!json) return null;

  try {
    return JSON.parse(json) as Record<string, IaaViewTreeNode>;
  } catch (error) {
    console.error("Failed to parse IAA viewTree", error);
    return null;
  }
};

const extractCatalystValue = (html: string, field: "useServiceTransactionId") => {
  const pattern = new RegExp(`Catalyst\\.${field} = "([^"]+)"`);
  return pattern.exec(html)?.[1] ?? null;
};

const getNodeId = (html: string, pattern: RegExp) => pattern.exec(html)?.[1] ?? null;

const extractSearchIds = (html: string) => {
  const useServiceTransactionId = extractCatalystValue(html, "useServiceTransactionId");
  const searchFieldId = getNodeId(
    html,
    /"([^"]+)":\{"id":"\1","nodetype":"attribute","attribute":"SearchByNameOrNumber"/,
  );
  const searchButtonId = getNodeId(html, /"([^"]+)":\{"id":"\1","nodetype":"button","text":\{"label":"Search"\}/);

  if (!useServiceTransactionId || !searchFieldId || !searchButtonId) return null;
  return { useServiceTransactionId, searchFieldId, searchButtonId };
};

const statusFromIaaValue = (value: string | null | undefined): LicenceCheckStatus => {
  const status = normaliseSearchText(value ?? "");

  if (status === "registered" || status === "current") return "licensed";
  if (["cancelled", "expired", "refused", "surrendered", "suspended"].includes(status)) return "not_licensed";

  return "unknown";
};

const collectDescendantIds = (state: Record<string, IaaViewTreeNode>, rootId: string) => {
  const result: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);

    const node = state[id];
    if (node?.children) stack.push(...node.children);
  }

  return result;
};

const parseSearchHits = (state: Record<string, IaaViewTreeNode>) => {
  const hits: SearchHit[] = [];

  for (const [id, node] of Object.entries(state)) {
    if (node.domain !== "Occupation" || node.widget !== "card") continue;

    const descendants = collectDescendantIds(state, id)
      .map(descendantId => state[descendantId])
      .filter(Boolean);
    const title = descendants.find(
      descendant =>
        descendant.nodetype === "button" && descendant.dos?.includes("searchView") && descendant.text?.label,
    )?.text?.label;

    const match = title?.match(/^(.*?)\s+\((\d{6,})\)$/);
    if (!match) continue;

    const statusNode = descendants.find(descendant => descendant.attribute === "Status");
    const statusValue =
      statusNode?.text?.dcText ??
      (typeof statusNode?.kv?.["ui-readonly-value"] === "string" ? statusNode.kv["ui-readonly-value"] : null) ??
      statusNode?.attributeValue;

    hits.push({
      name: htmlDecode(match[1].trim()),
      licenceNumber: match[2],
      status: statusFromIaaValue(statusValue),
    });
  }

  return hits;
};

const pickBestHit = (hits: SearchHit[], query: string) => {
  const normalisedQuery = normaliseSearchText(query);

  return (
    hits.find(hit => normaliseSearchText(hit.name) === normalisedQuery) ??
    hits.find(hit => normaliseSearchText(hit.name).includes(normalisedQuery)) ??
    hits.find(hit => hit.status === "licensed") ??
    hits[0] ??
    null
  );
};

const fetchText = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...browserHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`IAA request failed: ${response.status} ${url}`);
  }

  return response.text();
};

const getSetCookieHeaders = (headers: Headers) => {
  const cookieHeaders = headers as Headers & { getSetCookie?: () => string[] };
  return cookieHeaders.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
};

const cookieHeaderFromSetCookie = (headers: string[]) =>
  headers
    .map(header => header.split(";")[0])
    .filter(Boolean)
    .join("; ");

const fetchTextWithCookies = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...browserHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`IAA request failed: ${response.status} ${url}`);
  }

  return {
    text: await response.text(),
    cookieHeader: cookieHeaderFromSetCookie(getSetCookieHeaders(response.headers)),
  };
};

const searchIaaByName = async (query: string) => {
  let startHtml: string;
  let cookieHeader: string;

  try {
    const start = await fetchTextWithCookies(IAA_SEARCH_URL);
    startHtml = start.text;
    cookieHeader = start.cookieHeader;
  } catch {
    return searchIaaByNameWithPowerShell(query);
  }

  const ids = extractSearchIds(startHtml);
  if (!ids) {
    throw new Error("Could not find IAA search form IDs");
  }

  const body = JSON.stringify({
    returnRootHtmlOnChange: true,
    returnChangesOnly: false,
    commands: [
      {
        type: "view-node-set-attribute-value",
        id: ids.searchFieldId,
        value: query,
      },
      {
        type: "view-node-button-click",
        id: ids.searchButtonId,
      },
    ],
  });

  let content: string;

  try {
    content = await fetchText(`https://app.mbieregisters.govt.nz/iaa/ui/${ids.useServiceTransactionId}`, {
      method: "POST",
      body,
      headers: {
        ...jsonHeaders,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });
  } catch {
    return searchIaaByNameWithPowerShell(query);
  }

  const response = JSON.parse(content) as IaaSearchResponse;
  if (!response.state) return [];

  return parseSearchHits(response.state);
};

const runPowerShell = async (script: string, env: Record<string, string>) => {
  if (process.platform !== "win32") {
    throw new Error("PowerShell IAA fallback is only configured for local Windows demo runs");
  }

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      env: {
        ...process.env,
        ...env,
      },
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );

  return stdout.trim();
};

const searchIaaByNameWithPowerShell = async (query: string) => {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$startUrl = 'https://app.mbieregisters.govt.nz/iaa/ui/start/searchForAnOccupationalRegistration'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$html = (Invoke-WebRequest -Uri $startUrl -WebSession $session -UseBasicParsing).Content
$use = [regex]::Match($html, 'Catalyst\.useServiceTransactionId = "([^"]+)"').Groups[1].Value
$field = [regex]::Match($html, '"([^"]+)":\{"id":"\1","nodetype":"attribute","attribute":"SearchByNameOrNumber"').Groups[1].Value
$button = [regex]::Match($html, '"([^"]+)":\{"id":"\1","nodetype":"button","text":\{"label":"Search"\}').Groups[1].Value
if (-not $use -or -not $field -or -not $button) { throw 'Could not find IAA search form fields' }
$body = @{
  returnRootHtmlOnChange = $true
  returnChangesOnly = $false
  commands = @(
    @{ type = 'view-node-set-attribute-value'; id = $field; value = $env:ADVISA_IAA_QUERY },
    @{ type = 'view-node-button-click'; id = $button }
  )
} | ConvertTo-Json -Depth 8 -Compress
$headers = @{
  Accept = 'application/json, text/javascript, */*; q=0.01'
  Origin = 'https://app.mbieregisters.govt.nz'
  Referer = $startUrl
  'X-Requested-With' = 'XMLHttpRequest'
}
(Invoke-WebRequest -Uri "https://app.mbieregisters.govt.nz/iaa/ui/$use" -Method Post -Body $body -ContentType 'application/json; charset=UTF-8' -Headers $headers -WebSession $session -UseBasicParsing).Content
`;

  const content = await runPowerShell(script, {
    ADVISA_IAA_QUERY: query,
  });
  const response = JSON.parse(content) as IaaSearchResponse;

  return response.state ? parseSearchHits(response.state) : [];
};

const parseProfile = (html: string, licenceNumber: string): LicenceCheckResult | null => {
  const state = parseViewTree(html);
  if (!state) return null;

  const nodes = Object.values(state);
  const name =
    nodes.find(node => node.kv?.["ui-entity-name"] === "true" && node.text?.label)?.text?.label ??
    nodes
      .find(node => node.kv?.["ui-data-label-type"] === "entity-title" && node.text?.label)
      ?.text?.label?.replace(/\s+\(\d{6,}\)$/, "") ??
    null;

  const statusNode =
    nodes.find(node => node.attribute === "Status" && node.kv?.["ui-entity-status"] === "true") ??
    nodes.find(node => node.attribute === "Status" && node.text?.singleline);
  const status = statusFromIaaValue(
    statusNode?.text?.dcText ??
      (typeof statusNode?.kv?.["ui-readonly-value"] === "string" ? statusNode.kv["ui-readonly-value"] : null) ??
      statusNode?.attributeValue,
  );

  const licenceTypeNode = nodes.find(node => node.attribute === "LicenceType");
  const licenceType =
    licenceTypeNode?.text?.dcText ??
    (typeof licenceTypeNode?.kv?.["ui-readonly-value"] === "string" ? licenceTypeNode.kv["ui-readonly-value"] : null) ??
    licenceTypeNode?.attributeValue ??
    null;

  return {
    status,
    licenceType,
    checkedAt: new Date().toISOString(),
    adviserName: name ? htmlDecode(name) : null,
    licenceRef: status === "licensed" ? getLicenceRef(licenceNumber) : null,
    canProceed: status === "licensed",
    source: "iaa_register",
  };
};

const fetchProfile = async (licenceNumber: string, existingCookieHeader?: string) => {
  let html: string;

  try {
    const cookieHeader = existingCookieHeader ?? (await fetchTextWithCookies(IAA_SEARCH_URL)).cookieHeader;
    html = await fetchText(`${IAA_PROFILE_URL}/${licenceNumber}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
  } catch {
    html = await fetchProfileWithPowerShell(licenceNumber);
  }

  return parseProfile(html, licenceNumber);
};

const fetchProfileWithPowerShell = async (licenceNumber: string) => {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
(Invoke-WebRequest -Uri "https://app.mbieregisters.govt.nz/iaa/ext/adviser/view/$env:ADVISA_IAA_LICENCE" -UseBasicParsing).Content
`;

  return runPowerShell(script, {
    ADVISA_IAA_LICENCE: licenceNumber,
  });
};

export const checkIaaLicenceLive = async (query: string): Promise<LicenceCheckResult> => {
  const checkedAt = new Date().toISOString();
  const trimmedQuery = query.trim();

  try {
    const directLicenceNumber = /^\d{6,}$/.test(trimmedQuery) ? trimmedQuery : null;

    if (directLicenceNumber) {
      const profile = await fetchProfile(directLicenceNumber);
      if (profile) return profile;
    }

    const hits = await searchIaaByName(trimmedQuery);
    const bestHit = pickBestHit(hits, trimmedQuery);

    if (!bestHit) {
      return {
        status: "not_licensed",
        licenceType: null,
        checkedAt,
        adviserName: trimmedQuery,
        licenceRef: null,
        canProceed: false,
        source: "iaa_register",
      };
    }

    const profile = await fetchProfile(bestHit.licenceNumber);
    if (profile) return profile;

    return {
      status: bestHit.status,
      licenceType: null,
      checkedAt,
      adviserName: bestHit.name,
      licenceRef: bestHit.status === "licensed" ? getLicenceRef(bestHit.licenceNumber) : null,
      canProceed: bestHit.status === "licensed",
      source: "iaa_register",
    };
  } catch (error) {
    console.error("IAA live licence check failed", error);

    const demoFallback = getDemoFallbackLicenceCheck(trimmedQuery, checkedAt);
    if (demoFallback) return demoFallback;

    return {
      status: "unknown",
      licenceType: null,
      checkedAt,
      adviserName: trimmedQuery,
      licenceRef: null,
      canProceed: false,
      source: "unavailable",
    };
  }
};
