import { apiFetch } from "./client";
import type { Group } from "../shared/types";

export async function createGroup(input: { name: string }) {
  const response = await apiFetch("/groups/", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to create group");
  }

  return (await response.json()) as { group: Group };
}

export async function fetchMyGroups() {
  const response = await apiFetch("/groups/");

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load groups");
  }

  return (await response.json()) as { groups: Group[] };
}

export async function joinGroup(input: { inviteCode: string }) {
  const response = await apiFetch("/groups/join", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to join group");
  }

  return (await response.json()) as { group: Group };
}

export async function leaveGroup(groupID: string) {
  const response = await apiFetch(`/groups/${groupID}/leave`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to leave group");
  }
}

export async function deleteGroup(groupID: string) {
  const response = await apiFetch(`/groups/${groupID}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to delete group");
  }
}
