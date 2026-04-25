import { useEffect, useMemo, useState } from "react";
import { approveExpenseDelete, createCycleExpense, fetchCycleExpenses } from "../api/expenses";
import { fetchSettlementSummary } from "../api/settlementPlan";
import { formatErrorMessage } from "../lib/appHelpers";
import type { Cycle, Expense, Group, GroupMember, Member, PaymentRecord, Settlement } from "../shared/types";

type UseSettlementLedgerInput = {
  accessToken: string | null;
  selectedGroup: Group | null;
  selectedCycle: Cycle | null;
  groupMembers: GroupMember[];
  walletAddress: string | null;
};

type LedgerData = {
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  payments: PaymentRecord[];
};

const emptyLedger: LedgerData = {
  members: [],
  expenses: [],
  settlements: [],
  payments: [],
};

export function useSettlementLedger({
  accessToken,
  selectedGroup,
  selectedCycle,
  groupMembers,
  walletAddress,
}: UseSettlementLedgerInput) {
  const [ledger, setLedger] = useState<LedgerData>(emptyLedger);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expenseDeletePendingIDs, setExpenseDeletePendingIDs] = useState<string[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseErrorMessage, setExpenseErrorMessage] = useState<string | null>(null);

  const hasCycleSelected = Boolean(
    selectedGroup && selectedCycle && selectedCycle.groupId === selectedGroup.id,
  );

  const canAddExpense =
    Boolean(accessToken && selectedGroup && selectedCycle && groupMembers.length > 0) &&
    selectedCycle?.groupId === selectedGroup?.id &&
    selectedCycle?.status === "Active";

  const totals = useMemo(() => {
    const expenseTotal = ledger.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingCount = ledger.settlements.filter((settlement) => settlement.status === "Pending")
      .length;
    const verifiedCount = ledger.settlements.filter(
      (settlement) => settlement.status === "Verified",
    ).length;

    return {
      expenseTotal,
      pendingCount,
      verifiedCount,
    };
  }, [ledger.expenses, ledger.settlements]);

  useEffect(() => {
    if (!hasCycleSelected || !accessToken || !selectedGroup || !selectedCycle) {
      setLedger(emptyLedger);
      setErrorMessage(null);
      setLoading(false);
      setExpenseDeletePendingIDs([]);
      return;
    }

    void refreshLedger({
      groupID: selectedGroup.id,
      cycleID: selectedCycle.id,
      setLedger,
      setLoading,
      setErrorMessage,
      fallbackMessage: "Failed to load cycle finances",
    });
  }, [accessToken, hasCycleSelected, selectedGroup?.id, selectedCycle?.id]);

  function openExpenseDialog() {
    if (!canAddExpense) {
      return;
    }

    setExpenseErrorMessage(null);
    setIsExpenseDialogOpen(true);
  }

  function closeExpenseDialog() {
    if (expenseSubmitting) {
      return;
    }

    setIsExpenseDialogOpen(false);
    setExpenseErrorMessage(null);
  }

  async function submitExpense(input: {
    description: string;
    amount: number;
    paidByWallet: string;
    splits: Array<{
      walletAddress: string;
      amount: number;
    }>;
  }) {
    if (!selectedGroup || !selectedCycle) {
      setExpenseErrorMessage("A group and Settlement Cycle must be selected.");
      return;
    }

    setExpenseSubmitting(true);
    setExpenseErrorMessage(null);

    try {
      await createCycleExpense(selectedGroup.id, selectedCycle.id, input);
      await refreshLedger({
        groupID: selectedGroup.id,
        cycleID: selectedCycle.id,
        setLedger,
        setLoading,
        setErrorMessage,
        fallbackMessage: "Failed to load cycle finances",
      });
      setIsExpenseDialogOpen(false);
    } catch (error) {
      setExpenseErrorMessage(formatErrorMessage(error, "Failed to create expense"));
    } finally {
      setExpenseSubmitting(false);
    }
  }

  async function refresh() {
    if (!selectedGroup || !selectedCycle || selectedCycle.groupId !== selectedGroup.id) {
      return;
    }

    await refreshLedger({
      groupID: selectedGroup.id,
      cycleID: selectedCycle.id,
      setLedger,
      setLoading,
      setErrorMessage,
      fallbackMessage: "Failed to refresh balances",
    });
  }

  async function approveExpenseDeleteRequest(expenseID: string) {
    if (!selectedGroup || !selectedCycle) {
      return;
    }

    setExpenseDeletePendingIDs((currentIDs) =>
      currentIDs.includes(expenseID) ? currentIDs : [...currentIDs, expenseID],
    );
    setErrorMessage(null);

    try {
      await approveExpenseDelete(selectedGroup.id, selectedCycle.id, expenseID);
      await refreshLedger({
        groupID: selectedGroup.id,
        cycleID: selectedCycle.id,
        setLedger,
        setLoading,
        setErrorMessage,
        fallbackMessage: "Failed to refresh balances",
      });
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to approve expense deletion"));
    } finally {
      setExpenseDeletePendingIDs((currentIDs) =>
        currentIDs.filter((currentExpenseID) => currentExpenseID !== expenseID),
      );
    }
  }

  function resetUiState() {
    setExpenseDeletePendingIDs([]);
    setIsExpenseDialogOpen(false);
    setExpenseErrorMessage(null);
    setErrorMessage(null);
    setLoading(false);
  }

  return {
    cycle: {
      hasSelected: hasCycleSelected,
      canAddExpense,
    },
    summary: {
      members: ledger.members,
      expenses: ledger.expenses,
      settlements: ledger.settlements,
      payments: ledger.payments,
      totals,
      loading,
      errorMessage,
    },
    expenseDialog: {
      isOpen: isExpenseDialogOpen,
      submitting: expenseSubmitting,
      errorMessage: expenseErrorMessage,
      defaultPaidByWallet: walletAddress,
      open: openExpenseDialog,
      close: closeExpenseDialog,
      submit: submitExpense,
    },
    expenseDeletion: {
      pendingIDs: expenseDeletePendingIDs,
      approve: approveExpenseDeleteRequest,
    },
    refresh,
    resetUiState,
  };
}

async function refreshLedger({
  groupID,
  cycleID,
  setLedger,
  setLoading,
  setErrorMessage,
  fallbackMessage,
}: {
  groupID: string;
  cycleID: string;
  setLedger: React.Dispatch<React.SetStateAction<LedgerData>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  fallbackMessage: string;
}) {
  setLoading(true);
  setErrorMessage(null);

  try {
    const nextLedger = await loadSettlementLedger(groupID, cycleID);
    setLedger(nextLedger);
  } catch (error) {
    setLedger(emptyLedger);
    setErrorMessage(formatErrorMessage(error, fallbackMessage));
  } finally {
    setLoading(false);
  }
}

async function loadSettlementLedger(groupID: string, cycleID: string) {
  const [expensesResult, summaryResult] = await Promise.all([
    fetchCycleExpenses(groupID, cycleID),
    fetchSettlementSummary(groupID, cycleID),
  ]);

  return {
    expenses: expensesResult.expenses,
    members: summaryResult.summary.members,
    settlements: summaryResult.summary.settlements,
    payments: summaryResult.summary.payments ?? [],
  };
}
