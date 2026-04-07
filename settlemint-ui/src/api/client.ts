import { apiBaseURL } from "./config";
import { supabase } from "../lib/supabase";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiBaseURL}${path}`, {
    ...init,
    headers,
  });
}

export async function fetchAuthenticatedUser() {
  const response = await apiFetch("/auth/me");

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load authenticated user");
  }

  return (await response.json()) as {
    user: {
      id: string;
      email?: string;
      role: string;
      walletAddress: string;
    };
  };
}
