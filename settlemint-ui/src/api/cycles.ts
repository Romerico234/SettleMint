import { apiFetch } from "./client";
import type { Cycle, CycleArchive } from "../shared/types";

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

export async function fetchMyCycleArchives() {
  const response = await apiFetch("/cycles/archives/");

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load archived settlement cycles");
  }

  return (await response.json()) as { archives: CycleArchive[] };
}

export async function fetchArchiveSnapshot(archiveID: string) {
  const response = await apiFetch(`/cycles/archives/${archiveID}/json`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load archived settlement cycle");
  }

  return await response.json();
}

export async function closeSettlementCycle(
  groupID: string,
  cycleID: string,
  input: { archiveNotes?: string } = {},
) {
  const response = await apiFetch(`/groups/${groupID}/cycles/${cycleID}/close/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to close settlement cycle");
  }

  return (await response.json()) as { archive: CycleArchive };
}
