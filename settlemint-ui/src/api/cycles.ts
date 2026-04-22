import { apiFetch } from "./client";
import type { Cycle } from "../shared/types";

export async function fetchGroupCycles(groupID: string) {
  const response = await apiFetch(`/groups/${groupID}/cycles/`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load Settlement Cycles");
  }

  return (await response.json()) as { cycles: Cycle[] };
}

export async function createSettlementCycle(groupID: string, input: { name: string }) {
  const response = await apiFetch(`/groups/${groupID}/cycles/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to create Settlement Cycle");
  }

  return (await response.json()) as { cycle: Cycle };
}
