import { apiFetch } from "./client";
import type { Expense } from "../shared/types";

export async function fetchCycleExpenses(groupID: string, cycleID: string) {
  const response = await apiFetch(`/groups/${groupID}/cycles/${cycleID}/expenses/`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to load expenses");
  }

  return (await response.json()) as { expenses: Expense[] };
}

export async function createCycleExpense(
  groupID: string,
  cycleID: string,
  input: {
    description: string;
    amount: number;
    paidByWallet: string;
    splits: Array<{
      walletAddress: string;
      amount: number;
    }>;
  },
) {
  const response = await apiFetch(`/groups/${groupID}/cycles/${cycleID}/expenses/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to create expense");
  }

  return (await response.json()) as { expense: Expense };
}

export async function approveExpenseDelete(groupID: string, cycleID: string, expenseID: string) {
  const response = await apiFetch(
    `/groups/${groupID}/cycles/${cycleID}/expenses/${expenseID}/delete-approvals`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to approve expense deletion");
  }

  return (await response.json()) as {
    status: "pending" | "deleted";
    expenseId: string;
    approvalCount: number;
    requiredApprovalCount: number;
  };
}
