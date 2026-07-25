import { NextRequest, NextResponse } from "next/server";
import { Hex, isAddress, isHex, verifyMessage } from "viem";
import { createAdvisaPublicClient, createRelayerWalletClient, getAdvisaContract } from "~~/services/advisa/chain";

export const runtime = "nodejs";

type AnchorAgreementBody = {
  address?: string;
  chainId?: number;
  engagementId?: string;
  agreementHash?: Hex;
  signature?: Hex;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AnchorAgreementBody | null;
  const address = body?.address;
  const chainId = body?.chainId;
  const engagementId = body?.engagementId;
  const agreementHash = body?.agreementHash;
  const signature = body?.signature;

  if (
    !address ||
    !isAddress(address) ||
    !chainId ||
    !engagementId ||
    !/^\d+$/.test(engagementId) ||
    !agreementHash ||
    !isHex(agreementHash, { strict: true }) ||
    agreementHash.length !== 66 ||
    !signature ||
    !isHex(signature, { strict: true })
  ) {
    return NextResponse.json({ error: "Invalid agreement signature request" }, { status: 400 });
  }

  try {
    const id = BigInt(engagementId);
    const publicClient = createAdvisaPublicClient(chainId);
    const escrow = getAdvisaContract(chainId, "VisaEscrow");
    const engagement = (await publicClient.readContract({
      address: escrow.address,
      abi: escrow.abi,
      functionName: "engagements",
      args: [id],
    })) as readonly unknown[];
    const migrant = String(engagement[0]).toLowerCase();
    const anchoredHash = engagement[3] as Hex;
    const state = Number(engagement[8]);

    if (migrant !== address.toLowerCase()) {
      return NextResponse.json({ error: "This agreement belongs to a different client" }, { status: 403 });
    }

    const message = `AdVisa agreement ${agreementHash} for engagement #${engagementId} on chain ${chainId}`;
    const validSignature = await verifyMessage({ address, message, signature });
    if (!validSignature) {
      return NextResponse.json({ error: "The wallet signature is invalid" }, { status: 401 });
    }

    if (state !== 0) {
      if (anchoredHash.toLowerCase() !== agreementHash.toLowerCase()) {
        return NextResponse.json({ error: "A different agreement is already anchored" }, { status: 409 });
      }
      return NextResponse.json({ ok: true, idempotent: true, agreementHash });
    }

    const relayer = createRelayerWalletClient(chainId);
    const txHash = await relayer.writeContract({
      address: escrow.address,
      abi: escrow.abi,
      functionName: "anchorAgreement",
      args: [id, agreementHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({ ok: true, txHash, agreementHash });
  } catch (error) {
    console.error("Agreement anchoring failed:", error);
    return NextResponse.json({ error: "Could not anchor the agreement on-chain" }, { status: 500 });
  }
}
