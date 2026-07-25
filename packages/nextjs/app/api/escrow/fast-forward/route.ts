import { NextRequest, NextResponse } from "next/server";
import { hardhat } from "viem/chains";
import { privyAuthErrorResponse, requirePrivyAdmin } from "~~/services/privy/server";

export const runtime = "nodejs";

const DEFAULT_SECONDS = 6 * 24 * 60 * 60;

async function rpc(rpcUrl: string, method: string, params: unknown[] = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });

  const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? `RPC ${method} failed`);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePrivyAdmin(request);
  } catch (error) {
    return privyAuthErrorResponse(error);
  }

  const body = (await request.json().catch(() => null)) as { chainId?: number; seconds?: number } | null;
  const chainId = body?.chainId;
  const seconds = body?.seconds ?? DEFAULT_SECONDS;

  if (chainId !== hardhat.id) {
    return NextResponse.json({ error: "time travel is only available on local Hardhat" }, { status: 400 });
  }
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 60 * 24 * 60 * 60) {
    return NextResponse.json({ error: "invalid seconds" }, { status: 400 });
  }

  const rpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
  await rpc(rpcUrl, "evm_increaseTime", [seconds]);
  await rpc(rpcUrl, "evm_mine");

  return NextResponse.json({ ok: true, seconds });
}
