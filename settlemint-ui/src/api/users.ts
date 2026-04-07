import { apiFetch } from "./client";

export type UserProfile = {
  id: string;
  displayName: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchMyProfile() {
  const response = await apiFetch("/users/me");

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load user profile");
  }

  return (await response.json()) as { profile: UserProfile };
}

export async function updateMyProfile(input: {
  displayName: string;
}) {
  const response = await apiFetch("/users/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to update user profile");
  }

  return (await response.json()) as { profile: UserProfile };
}
