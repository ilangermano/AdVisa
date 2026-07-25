"use client";

import { getAccessToken } from "@privy-io/react-auth";

const fetchWithToken = (token: string, input: RequestInfo | URL, init: RequestInit) => {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
};

export async function privyFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Sign in required");
  }

  return fetchWithToken(accessToken, input, init);
}
