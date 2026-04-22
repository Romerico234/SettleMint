import { apiFetch } from "./client";
import type { SettlementSummary } from "../shared/types";

export async function fetchSettlementSummary(groupID: string, cycleID: string) {
  const response = await apiFetch(`/groups/${groupID}/cycles/${cycleID}/settlement-plan/`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load settlement plan");
  }

  return (await response.json()) as { summary: SettlementSummary };
}
