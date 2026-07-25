import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Hex, isAddress } from "viem";
import {
  createAdvisaPublicClient,
  createRelayerWalletClient,
  getAdvisaContract,
  isAdvisaChainId,
} from "~~/services/advisa/chain";
import { isAdvisaDemoMode } from "~~/services/advisa/demoMode";
import { getSupabaseAdmin } from "~~/services/supabase/server";
import type { ExtractionResult } from "~~/types/advisa";

export const runtime = "nodejs";

type Party = {
  name: string;
  email: string;
  address: string;
};

type SigningRequestBody = {
  chainId: number;
  engagementId: number;
  engagementRowId?: string;
  adviserLicenceRef: string;
  migrant: Party;
  adviser: Party;
  agreementFileName: string;
  agreementPdfBase64: string;
  extractedAgreement: ExtractionResult;
};

function requiredString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDocumentId(luminResponse: unknown): string | null {
  if (!luminResponse || typeof luminResponse !== "object") return null;
  const data = luminResponse as Record<string, unknown>;

  const direct = data.documentId ?? data.document_id ?? data.id;
  if (typeof direct === "string") return direct;

  const document = data.document;
  if (document && typeof document === "object") {
    const nested = (document as Record<string, unknown>).id ?? (document as Record<string, unknown>).documentId;
    if (typeof nested === "string") return nested;
  }

  return null;
}

function getEngagementState(engagement: unknown) {
  return Array.isArray(engagement) ? Number(engagement[8]) : undefined;
}

async function createDemoSigningRequest(body: SigningRequestBody, pdfBytes: Buffer) {
  if (!isAdvisaChainId(body.chainId)) {
    return NextResponse.json({ error: "unsupported demo chain" }, { status: 400 });
  }

  const agreementHash = `0x${crypto.createHash("sha256").update(pdfBytes).digest("hex")}` as Hex;
  const engagementId = BigInt(body.engagementId);
  const publicClient = createAdvisaPublicClient(body.chainId);
  const walletClient = createRelayerWalletClient(body.chainId);
  const visaEscrow = getAdvisaContract(body.chainId, "VisaEscrow");

  const engagement = await publicClient.readContract({
    address: visaEscrow.address,
    abi: visaEscrow.abi,
    functionName: "engagements",
    args: [engagementId],
  });
  const engagementState = getEngagementState(engagement);

  let anchorTxHash: Hex | undefined;
  if (engagementState === 0) {
    anchorTxHash = await walletClient.writeContract({
      address: visaEscrow.address,
      abi: visaEscrow.abi,
      functionName: "anchorAgreement",
      args: [engagementId, agreementHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: anchorTxHash });
  }

  return NextResponse.json({
    ok: true,
    demoMode: true,
    luminDocumentId: `demo-${body.chainId}-${body.engagementId}`,
    agreementHash,
    anchorTxHash,
    alreadyAnchored: engagementState !== 0,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SigningRequestBody | null;
  if (
    !body ||
    !Number.isInteger(body.chainId) ||
    !Number.isInteger(body.engagementId) ||
    !requiredString(body.adviserLicenceRef) ||
    !requiredString(body.agreementFileName) ||
    !requiredString(body.agreementPdfBase64) ||
    !requiredString(body.migrant?.name) ||
    !requiredString(body.migrant?.email) ||
    !isAddress(body.migrant.address) ||
    !requiredString(body.adviser?.name) ||
    !requiredString(body.adviser?.email) ||
    !isAddress(body.adviser.address) ||
    !body.extractedAgreement?.milestones?.length
  ) {
    return NextResponse.json({ error: "invalid signing request payload" }, { status: 400 });
  }

  const pdfBytes = Buffer.from(body.agreementPdfBase64, "base64");
  if (!pdfBytes.length) {
    return NextResponse.json({ error: "agreement PDF is empty" }, { status: 400 });
  }

  if (isAdvisaDemoMode(["LUMIN_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    return createDemoSigningRequest(body, pdfBytes);
  }

  const db = getSupabaseAdmin() as any;
  const luminApiKey = process.env.LUMIN_API_KEY;
  if (!luminApiKey) {
    console.error("LUMIN_API_KEY is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const unsignedBucket = process.env.SUPABASE_AGREEMENTS_BUCKET || "fee-agreements";
  const unsignedPath = `engagements/${body.chainId}-${body.engagementId}/unsigned-${Date.now()}-${body.agreementFileName}`;

  const upload = await db.storage.from(unsignedBucket).upload(unsignedPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    console.error("Supabase unsigned agreement upload failed:", upload.error);
    return NextResponse.json({ error: "could not store agreement PDF" }, { status: 500 });
  }

  const baseUrl = process.env.LUMIN_API_BASE_URL || "https://api.luminpdf.com/v1";
  const endpoint = process.env.LUMIN_SIGNING_REQUEST_URL || `${baseUrl}/signing-requests`;
  const webhookUrl = process.env.LUMIN_WEBHOOK_URL;

  const luminRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${luminApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: `AdVisa fee agreement #${body.engagementId}`,
      file: {
        name: body.agreementFileName,
        contentType: "application/pdf",
        base64: body.agreementPdfBase64,
      },
      participants: [
        {
          role: "migrant",
          name: body.migrant.name,
          email: body.migrant.email,
        },
        {
          role: "adviser",
          name: body.adviser.name,
          email: body.adviser.email,
        },
      ],
      metadata: {
        chainId: String(body.chainId),
        engagementId: String(body.engagementId),
        engagementRowId: body.engagementRowId,
      },
      webhookUrl,
    }),
  });

  const luminPayload = (await luminRes.json().catch(() => null)) as unknown;
  if (!luminRes.ok) {
    console.error("Lumin signing request failed:", luminRes.status, luminPayload);
    return NextResponse.json({ error: "could not create Lumin signing request" }, { status: 502 });
  }

  const luminDocumentId = parseDocumentId(luminPayload);
  if (!luminDocumentId) {
    console.error("Lumin response did not include a document id:", luminPayload);
    return NextResponse.json({ error: "Lumin response missing document id" }, { status: 502 });
  }

  const engagementPatch = {
    migrant_id: body.migrant.address,
    adviser_id: body.adviser.address,
    adviser_licence_ref: body.adviserLicenceRef,
    contract_engagement_id: body.engagementId,
    lumin_document_id: luminDocumentId,
  };

  const engagementWrite = body.engagementRowId
    ? await db.from("engagements").update(engagementPatch).eq("id", body.engagementRowId).select("id").single()
    : await db
        .from("engagements")
        .upsert(engagementPatch, { onConflict: "contract_engagement_id" })
        .select("id")
        .single();

  if (engagementWrite.error) {
    console.error("Supabase engagement update failed:", engagementWrite.error);
    return NextResponse.json({ error: "could not record Lumin document id" }, { status: 500 });
  }

  const documentWrite = await db.from("documents").insert({
    engagement_id: engagementWrite.data.id,
    storage_path: unsignedPath,
    extracted_json: body.extractedAgreement,
  });
  if (documentWrite.error) {
    console.error("Supabase document insert failed:", documentWrite.error);
    return NextResponse.json({ error: "could not record agreement metadata" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    luminDocumentId,
    engagementRowId: engagementWrite.data.id,
    storedAgreementPath: unsignedPath,
  });
}
