import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Hex } from "viem";
import {
  createAdvisaPublicClient,
  createRelayerWalletClient,
  getAdvisaContract,
  isAdvisaChainId,
} from "~~/services/advisa/chain";
import { recheckAdviserLicenceForEngagement } from "~~/services/advisa/licence";
import { privyAuthErrorResponse, requirePrivyAdmin } from "~~/services/privy/server";

export const runtime = "nodejs";

type AdminAction = "submitProofAndComplete" | "refundAfterLicenceCheck" | "pauseClock" | "resumeClock";

type AdminRequestBody = {
  action?: AdminAction;
  chainId?: number;
  engagementId?: string | number;
  proofText?: string;
  proofHash?: Hex;
};

function hashProof(proofText: string): Hex {
  return `0x${crypto.createHash("sha256").update(proofText).digest("hex")}` as Hex;
}

async function writeRelayerTx(chainId: number, functionName: string, args: readonly unknown[]) {
  const visaEscrow = getAdvisaContract(chainId, "VisaEscrow");
  const walletClient = createRelayerWalletClient(chainId);
  return walletClient.writeContract({
    address: visaEscrow.address,
    abi: visaEscrow.abi,
    functionName,
    args,
  });
}

export async function POST(request: NextRequest) {
  try {
    await requirePrivyAdmin(request);
  } catch (error) {
    return privyAuthErrorResponse(error);
  }

  const body = (await request.json().catch(() => null)) as AdminRequestBody | null;
  const chainId = body?.chainId;
  const engagementIdRaw = body?.engagementId;

  if (!body?.action || !chainId || !isAdvisaChainId(chainId) || engagementIdRaw === undefined) {
    return NextResponse.json({ error: "invalid admin action payload" }, { status: 400 });
  }

  if (!/^\d+$/.test(String(engagementIdRaw))) {
    return NextResponse.json({ error: "invalid engagementId" }, { status: 400 });
  }

  const engagementId = BigInt(engagementIdRaw);
  const publicClient = createAdvisaPublicClient(chainId);

  if (body.action === "pauseClock") {
    const txHash = await writeRelayerTx(chainId, "pauseClock", [engagementId]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({ ok: true, txHash });
  }

  if (body.action === "resumeClock") {
    const txHash = await writeRelayerTx(chainId, "resumeClock", [engagementId]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({ ok: true, txHash });
  }

  const licence = await recheckAdviserLicenceForEngagement(engagementId);

  if (!licence.licensed) {
    const txHash = await writeRelayerTx(chainId, "refundAll", [engagementId]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({
      ok: true,
      action: "refundAll",
      licenceStatus: licence.status,
      checkedAt: licence.checkedAt,
      txHash,
    });
  }

  if (body.action === "refundAfterLicenceCheck") {
    return NextResponse.json(
      {
        error: "adviser licence is still licensed; refundAll was not called",
        licenceStatus: licence.status,
        checkedAt: licence.checkedAt,
      },
      { status: 409 },
    );
  }

  const proofHash = body.proofHash ?? (body.proofText ? hashProof(body.proofText) : undefined);
  if (!proofHash) {
    return NextResponse.json({ error: "proofText or proofHash required" }, { status: 400 });
  }

  const submitTxHash = await writeRelayerTx(chainId, "submitProof", [engagementId, proofHash]);
  await publicClient.waitForTransactionReceipt({ hash: submitTxHash });

  const completeTxHash = await writeRelayerTx(chainId, "completeMilestone", [engagementId]);
  await publicClient.waitForTransactionReceipt({ hash: completeTxHash });

  return NextResponse.json({
    ok: true,
    action: "completeMilestone",
    licenceStatus: licence.status,
    checkedAt: licence.checkedAt,
    proofHash,
    submitTxHash,
    completeTxHash,
  });
}
