"use client";

import { getAccessToken } from "@privy-io/react-auth";

export async function privyFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Sign in required");
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
