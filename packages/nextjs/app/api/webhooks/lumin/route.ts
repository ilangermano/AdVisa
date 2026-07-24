import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

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

  // TODO: confirm Lumin's actual webhook payload shape (event type, document id,
  // download URL, and however we round-trip our own engagement id through Lumin —
  // e.g. as signing-request metadata set when we created the request).
  const payload = JSON.parse(rawBody) as {
    documentId?: string;
    downloadUrl?: string;
    metadata?: { engagementId?: string };
  };

  const luminDocumentId = payload.documentId;
  const engagementId = payload.metadata?.engagementId;

  if (!luminDocumentId || !engagementId) {
    return NextResponse.json({ error: "missing documentId or engagementId" }, { status: 400 });
  }

  // TODO: idempotency check — look up luminDocumentId in Supabase; if we've already
  // anchored this document, return 200 immediately (no-op) instead of re-anchoring.

  // TODO: download the final signed PDF from Lumin using LUMIN_API_KEY:
  //   const pdfRes = await fetch(payload.downloadUrl, {
  //     headers: { Authorization: `Bearer ${process.env.LUMIN_API_KEY}` },
  //   });
  //   const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
  const pdfBytes = new Uint8Array();

  const agreementHash = `0x${crypto.createHash("sha256").update(pdfBytes).digest("hex")}`;

  // TODO: store pdfBytes in a private Supabase Storage bucket, keyed by engagementId.
  // No personal data goes on-chain — the PDF itself lives only in Supabase; only its
  // hash is anchored below.

  // TODO: call VisaEscrow.anchorAgreement(engagementId, agreementHash) from the
  // RELAYER_ROLE wallet (RELAYER_PRIVATE_KEY), against the deployed contract address
  // for the active network (packages/nextjs/contracts/deployedContracts.ts), e.g.:
  //   const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);
  //   const walletClient = createWalletClient({ account: relayer, chain, transport: http(rpcUrl) });
  //   await walletClient.writeContract({
  //     address: visaEscrowAddress,
  //     abi: visaEscrowAbi,
  //     functionName: "anchorAgreement",
  //     args: [BigInt(engagementId), agreementHash],
  //   });

  return NextResponse.json({ ok: true, agreementHash });
}
