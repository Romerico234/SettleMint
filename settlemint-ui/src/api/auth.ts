import { apiBaseURL } from "./config";
import { apiFetch } from "./client";

type AuthenticatedUser = {
  id: string;
  email?: string;
  role: string;
  walletAddress: string;
};

export async function createAuthChallenge(input: {
  walletAddress: string;
  domain: string;
  uri: string;
  chainId: number;
}) {
  const response = await fetch(`${apiBaseURL}/auth/challenge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to create auth challenge");
  }

  return (await response.json()) as {
    message: string;
    nonce: string;
    issuedAt: string;
    expiresAt: string;
  };
}

export async function verifyWalletSignature(input: {
  walletAddress: string;
  message: string;
  signature: string;
}) {
  const response = await fetch(`${apiBaseURL}/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to verify wallet signature");
  }

  return (await response.json()) as {
    token: string;
    user: AuthenticatedUser;
  };
}

export async function fetchAuthenticatedUser() {
  const response = await apiFetch("/auth/me");

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load authenticated user");
  }

  return (await response.json()) as { user: AuthenticatedUser };
}
