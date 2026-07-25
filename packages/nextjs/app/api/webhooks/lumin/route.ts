import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { createAdvisaPublicClient, createRelayerWalletClient, getAdvisaContract } from "~~/services/advisa/chain";
import { getSupabaseAdmin } from "~~/services/supabase/server";

// Force the Node.js runtime — `node:crypto`'s `timingSafeEqual` is not available on
// the Edge runtime, and HMAC verification here must not be reimplemented insecurely.
export const runtime = "nodejs";

/**
 * Verifies `signatureHex` against an HMAC-SHA256 of the RAW request body, using a
 * constant-time comparison. Must run before the body is parsed as JSON — see
 * docs/INTEGRATIONS.md.
 */
function verifySignature(rawBody: string, signatureHex: string | null, secret: string): boolean {
  if (!signatureHex) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

type LuminWebhookPayload = {
  documentId?: string;
  document_id?: string;
  downloadUrl?: string;
  download_url?: string;
  metadata?: {
    chainId?: string | number;
    engagementId?: string | number;
    engagementRowId?: string;
  };
  document?: {
    id?: string;
    documentId?: string;
    downloadUrl?: string;
    download_url?: string;
  };
  data?: {
    documentId?: string;
    document_id?: string;
    downloadUrl?: string;
    download_url?: string;
    metadata?: LuminWebhookPayload["metadata"];
  };
};

function getWebhookDocumentId(payload: LuminWebhookPayload) {
  return (
    payload.documentId ??
    payload.document_id ??
    payload.document?.id ??
    payload.document?.documentId ??
    payload.data?.documentId ??
    payload.data?.document_id
  );
}

function getWebhookDownloadUrl(payload: LuminWebhookPayload) {
  return (
    payload.downloadUrl ??
    payload.download_url ??
    payload.document?.downloadUrl ??
    payload.document?.download_url ??
    payload.data?.downloadUrl ??
    payload.data?.download_url
  );
}

function getWebhookMetadata(payload: LuminWebhookPayload) {
  return payload.metadata ?? payload.data?.metadata;
}

async function readEngagementState(chainId: number, engagementId: bigint) {
  const publicClient = createAdvisaPublicClient(chainId);
  const visaEscrow = getAdvisaContract(chainId, "VisaEscrow");
  const engagement = await publicClient.readContract({
    address: visaEscrow.address,
    abi: visaEscrow.abi,
    functionName: "engagements",
    args: [engagementId],
  });

  return Number((engagement as readonly unknown[])[8]);
}

/**
 * Lumin Sign webhook: fires once both parties have signed the fee agreement.
 *
 * Flow (see docs/INTEGRATIONS.md § Lumin Sign webhook):
 *   verify HMAC (raw body) -> download signed PDF -> sha256(pdf) -> store PDF in
 *   Supabase Storage (private bucket) -> escrow.anchorAgreement(id, hash) via the
 *   RELAYER_ROLE wallet -> AgreementAnchored event, fund() now unlocks.
 *
 * Idempotent on Lumin's document id — Lumin retries webhooks, so a document we've
 * already anchored is a no-op, not an error.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // TODO: confirm Lumin's actual signature header name against their webhook docs.
  const signatureHeader = request.headers.get("lumin-signature");

  const secret = process.env.LUMIN_WEBHOOK_SECRET;
  if (!secret) {
    console.error("LUMIN_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  // Verify FIRST, before anything below ever looks at the body.
  if (!verifySignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const db = getSupabaseAdmin() as any;

  let payload: LuminWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LuminWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const metadata = getWebhookMetadata(payload);
  const luminDocumentId = getWebhookDocumentId(payload);
  const engagementId = metadata?.engagementId;
  const chainId = Number(metadata?.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? baseSepolia.id);

  if (!luminDocumentId || !engagementId || !Number.isInteger(chainId)) {
    return NextResponse.json({ error: "missing documentId or engagementId" }, { status: 400 });
  }
  if (!/^\d+$/.test(String(engagementId))) {
    return NextResponse.json({ error: "invalid engagementId" }, { status: 400 });
  }

  const contractEngagementId = BigInt(engagementId);
  const existingEngagement = await db
    .from("engagements")
    .select("id, contract_engagement_id, agreement_pdf_path, lumin_document_id")
    .eq("lumin_document_id", luminDocumentId)
    .maybeSingle();

  if (existingEngagement.error) {
    console.error("Supabase Lumin idempotency lookup failed:", existingEngagement.error);
    return NextResponse.json({ error: "could not check webhook idempotency" }, { status: 500 });
  }

  const state = await readEngagementState(chainId, contractEngagementId);
  if (existingEngagement.data?.agreement_pdf_path && state !== 0) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const luminApiKey = process.env.LUMIN_API_KEY;
  if (!luminApiKey) {
    console.error("LUMIN_API_KEY is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const downloadUrl =
    getWebhookDownloadUrl(payload) ||
    `${process.env.LUMIN_API_BASE_URL || "https://api.luminpdf.com/v1"}/documents/${luminDocumentId}/download`;

  const pdfRes = await fetch(downloadUrl, {
    headers: { authorization: `Bearer ${luminApiKey}` },
  });
  if (!pdfRes.ok) {
    console.error("Lumin signed PDF download failed:", pdfRes.status, await pdfRes.text());
    return NextResponse.json({ error: "could not download signed PDF" }, { status: 502 });
  }

  const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
  if (!pdfBytes.length) {
    return NextResponse.json({ error: "signed PDF was empty" }, { status: 502 });
  }

  const agreementHash = `0x${crypto.createHash("sha256").update(pdfBytes).digest("hex")}` as Hex;

  const signedBucket = process.env.SUPABASE_SIGNED_AGREEMENTS_BUCKET || "signed-agreements";
  const signedPath = `engagements/${chainId}-${contractEngagementId.toString()}/signed-${luminDocumentId}.pdf`;
  const upload = await db.storage.from(signedBucket).upload(signedPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) {
    console.error("Supabase signed PDF upload failed:", upload.error);
    return NextResponse.json({ error: "could not store signed PDF" }, { status: 500 });
  }

  const engagementUpdate = await db
    .from("engagements")
    .update({
      agreement_pdf_path: signedPath,
      lumin_document_id: luminDocumentId,
    })
    .eq("contract_engagement_id", Number(contractEngagementId))
    .select("id")
    .maybeSingle();

  if (engagementUpdate.error) {
    console.error("Supabase engagement signed PDF update failed:", engagementUpdate.error);
    return NextResponse.json({ error: "could not update engagement" }, { status: 500 });
  }

  if (state !== 0) {
    return NextResponse.json({ ok: true, idempotent: true, agreementHash });
  }

  const visaEscrow = getAdvisaContract(chainId, "VisaEscrow");
  const relayerClient = createRelayerWalletClient(chainId);
  const txHash = await relayerClient.writeContract({
    address: visaEscrow.address,
    abi: visaEscrow.abi,
    functionName: "anchorAgreement",
    args: [contractEngagementId, agreementHash],
  });

  return NextResponse.json({ ok: true, agreementHash, txHash });
}
