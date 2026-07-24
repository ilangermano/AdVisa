import { NextRequest, NextResponse } from "next/server";
import { checkIaaLicenceLive, getNegativeLookupRef } from "~~/services/licence-check/iaa";
import { cacheLicenceCheck, getFreshCachedLicenceCheck } from "~~/services/licence-check/supabase";

export const runtime = "nodejs";

type LicenceCheckRequest = {
  adviserName?: unknown;
  name?: unknown;
  forceRefresh?: unknown;
};

const getRequestedName = (body: LicenceCheckRequest) => {
  const candidate = typeof body.adviserName === "string" ? body.adviserName : body.name;
  return typeof candidate === "string" ? candidate.trim() : "";
};

export async function POST(request: NextRequest) {
  let body: LicenceCheckRequest;

  try {
    body = (await request.json()) as LicenceCheckRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const adviserName = getRequestedName(body);
  if (adviserName.length < 2) {
    return NextResponse.json({ error: "adviserName must be at least 2 characters" }, { status: 400 });
  }

  const forceRefresh = body.forceRefresh === true;

  if (!forceRefresh) {
    const cached = await getFreshCachedLicenceCheck(adviserName);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  const live = await checkIaaLicenceLive(adviserName);

  await cacheLicenceCheck({
    licence_ref: live.licenceRef ?? getNegativeLookupRef(adviserName),
    name: live.adviserName ?? adviserName,
    status: live.status,
    checked_at: live.checkedAt,
  });

  return NextResponse.json(live, {
    status: live.status === "unknown" ? 503 : 200,
  });
}
