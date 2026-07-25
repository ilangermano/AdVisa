import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, formatEther, http, isAddress, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji, baseSepolia, sepolia } from "viem/chains";

export const runtime = "nodejs";

// Testnet gas only — small enough that a griefer draining the relayer is an
// annoyance to top up again, never a real loss. See CONTEXT.md's "known limitations":
// the relayer is a single hot key, same one used to top up gas here.
const MIN_BALANCE = parseEther("0.0005");
const TOP_UP_AMOUNT = parseEther("0.001");

const CHAINS = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  },
  [sepolia.id]: {
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL,
  },
  [avalancheFuji.id]: {
    chain: avalancheFuji,
    rpcUrl: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  },
} as const;

// Crude in-memory rate limit — resets on redeploy/restart. Good enough for a
// hackathon demo instance; a real deployment needs a shared store (Supabase, Redis).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOP_UPS_PER_WINDOW = 3;
const recentTopUpsByAddress = new Map<string, number[]>();

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : "Unknown error";
};

export async function POST(request: NextRequest) {
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerKey) {
    console.error("RELAYER_PRIVATE_KEY is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { address?: string; chainId?: number } | null;
  const address = body?.address;
  const chainId = body?.chainId;

  if (!address || !isAddress(address) || !chainId || !(chainId in CHAINS)) {
    return NextResponse.json({ error: "invalid address or unsupported chainId" }, { status: 400 });
  }

  const { chain, rpcUrl } = CHAINS[chainId as keyof typeof CHAINS];
  if (!rpcUrl) {
    console.error(`No RPC URL configured for chain ${chainId}`);
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const now = Date.now();
  const rateLimitKey = `${chainId}:${address.toLowerCase()}`;
  const recentTopUps = (recentTopUpsByAddress.get(rateLimitKey) || []).filter(ts => now - ts < WINDOW_MS);
  if (recentTopUps.length >= MAX_TOP_UPS_PER_WINDOW) {
    return NextResponse.json({ error: "rate limited, try again shortly" }, { status: 429 });
  }

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  let balance: bigint;
  try {
    balance = await publicClient.getBalance({ address });
  } catch (error) {
    console.error(`Could not read testnet balance on chain ${chainId}:`, error);
    return NextResponse.json({ error: `Could not read testnet balance: ${getErrorMessage(error)}` }, { status: 502 });
  }

  if (balance >= MIN_BALANCE) {
    return NextResponse.json({ funded: false, reason: "sufficient", balance: formatEther(balance) });
  }

  let txHash: `0x${string}`;
  try {
    const relayer = privateKeyToAccount(relayerKey as `0x${string}`);
    const walletClient = createWalletClient({ account: relayer, chain, transport: http(rpcUrl) });
    txHash = await walletClient.sendTransaction({ to: address, value: TOP_UP_AMOUNT });
  } catch (error) {
    console.error(`Could not send testnet gas on chain ${chainId}:`, error);
    return NextResponse.json({ error: `Testnet gas top-up failed: ${getErrorMessage(error)}` }, { status: 502 });
  }

  recentTopUps.push(now);
  recentTopUpsByAddress.set(rateLimitKey, recentTopUps);

  return NextResponse.json({ funded: true, txHash });
}
