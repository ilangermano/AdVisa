import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import "server-only";

export type PrivyUserClaims = {
  userId: string;
  sessionId: string;
};

export class PrivyAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 503,
  ) {
    super(message);
    this.name = "PrivyAuthError";
  }
}

let privyClient: PrivyClient | null = null;

function getPrivyClient() {
  if (privyClient) return privyClient;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new PrivyAuthError("Privy server authentication is not configured", 503);
  }

  privyClient = new PrivyClient({ appId, appSecret });
  return privyClient;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new PrivyAuthError("Sign in required", 401);
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new PrivyAuthError("Sign in required", 401);
  }
  return token;
}

export async function requirePrivyUser(request: NextRequest): Promise<PrivyUserClaims> {
  const client = getPrivyClient();
  const token = getBearerToken(request);

  try {
    const claims = await client.utils().auth().verifyAccessToken(token);
    return {
      userId: claims.user_id,
      sessionId: claims.session_id,
    };
  } catch {
    throw new PrivyAuthError("Invalid or expired sign-in", 401);
  }
}

export async function requirePrivyEmbeddedWallet(request: NextRequest, address: string) {
  const claims = await requirePrivyUser(request);
  const client = getPrivyClient();

  let user;
  try {
    user = await client.users().getByWalletAddress({ address });
  } catch {
    throw new PrivyAuthError("Wallet is not linked to the signed-in user", 403);
  }

  const normalizedAddress = address.toLowerCase();
  const isOwnedEmbeddedWallet =
    user.id === claims.userId &&
    user.linked_accounts.some(account => {
      if (account.type !== "wallet") return false;
      const wallet = account as unknown as { address?: string; chain_type?: string; wallet_client_type?: string };
      return (
        wallet.address?.toLowerCase() === normalizedAddress &&
        wallet.chain_type === "ethereum" &&
        wallet.wallet_client_type === "privy"
      );
    });

  if (!isOwnedEmbeddedWallet) {
    throw new PrivyAuthError("Wallet is not the signed-in user's Privy embedded wallet", 403);
  }

  return claims;
}

export async function requirePrivyAdmin(request: NextRequest) {
  const claims = await requirePrivyUser(request);
  const adminUserIds = new Set(
    (process.env.PRIVY_ADMIN_USER_IDS || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean),
  );

  if (adminUserIds.size === 0) {
    throw new PrivyAuthError("Privy administrator allowlist is not configured", 503);
  }
  if (!adminUserIds.has(claims.userId)) {
    throw new PrivyAuthError("Administrator access required", 403);
  }

  return claims;
}

export function privyAuthErrorResponse(error: unknown) {
  if (error instanceof PrivyAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Privy authentication failed:", error);
  return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
}
