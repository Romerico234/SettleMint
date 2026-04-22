import { useEffect, useMemo, useState } from "react";
import { approveExpenseDelete, createCycleExpense, fetchCycleExpenses } from "../api/expenses";
import { fetchSettlementSummary } from "../api/settlementPlan";
import { formatErrorMessage } from "../lib/appHelpers";
import type { Cycle, Expense, Group, GroupMember, Member, Settlement } from "../shared/types";

type UseCycleFinanceInput = {
  accessToken: string | null;
  selectedGroup: Group | null;
  selectedCycle: Cycle | null;
  groupMembers: GroupMember[];
  walletAddress: string | null;
};

export function useCycleFinance({
  accessToken,
  selectedGroup,
  selectedCycle,
  groupMembers,
  walletAddress,
}: UseCycleFinanceInput) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [expenseDeletePendingIDs, setExpenseDeletePendingIDs] = useState<string[]>([]);
  const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [createExpenseError, setCreateExpenseError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const hasSelectedCycle = Boolean(
    selectedGroup && selectedCycle && selectedCycle.groupId === selectedGroup.id,
  );
  
  const canAddExpense =
    Boolean(accessToken && selectedGroup && selectedCycle && groupMembers.length > 0) &&
    selectedCycle?.groupId === selectedGroup?.id &&
    selectedCycle?.status === "Active";

  const totals = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const pendingCount = settlements.filter((settlement) => settlement.status === "Pending").length;
    const verifiedCount = settlements.filter((settlement) => settlement.status === "Verified").length;

    return {
      expenseTotal,
      pendingCount,
      verifiedCount,
    };
  }, [expenses, settlements]);

  useEffect(() => {
    if (!accessToken || !selectedGroup || !selectedCycle || selectedCycle.groupId !== selectedGroup.id) {
      setMembers([]);
      setExpenses([]);
      setSettlements([]);
      setFinanceError(null);
      setFinanceLoading(false);
      setExpenseDeletePendingIDs([]);
      return;
    }

    let mounted = true;
    setFinanceLoading(true);
    setFinanceError(null);

    loadCycleFinance(selectedGroup.id, selectedCycle.id)
      .then((result) => {
        if (mounted) {
          setExpenses(result.expenses);
          setMembers(result.members);
          setSettlements(result.settlements);
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setExpenses([]);
          setMembers([]);
          setSettlements([]);
          setFinanceError(formatErrorMessage(error, "Failed to load cycle finances"));
        }
      })
      .finally(() => {
        if (mounted) {
          setFinanceLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, selectedGroup?.id, selectedCycle?.id, selectedCycle?.groupId]);

  function handleOpenCreateExpenseModal() {
    if (!canAddExpense) {
      return;
    }

    setCreateExpenseError(null);
    setIsCreateExpenseModalOpen(true);
  }

  function handleCloseCreateExpenseModal() {
    if (expenseSubmitting) {
      return;
    }

    setIsCreateExpenseModalOpen(false);
    setCreateExpenseError(null);
  }

  async function handleSubmitCreateExpense(input: {
    description: string;
    amount: number;
    paidByWallet: string;
    splits: Array<{
      walletAddress: string;
      amount: number;
    }>;
  }) {
    if (!selectedGroup || !selectedCycle) {
      setCreateExpenseError("A group and Settlement Cycle must be selected.");
      return;
    }

    setExpenseSubmitting(true);
    setCreateExpenseError(null);

    try {
      await createCycleExpense(selectedGroup.id, selectedCycle.id, input);
      const result = await loadCycleFinance(selectedGroup.id, selectedCycle.id);
      setExpenses(result.expenses);
      setMembers(result.members);
      setSettlements(result.settlements);
      setFinanceError(null);
      setIsCreateExpenseModalOpen(false);
    } catch (error) {
      setCreateExpenseError(formatErrorMessage(error, "Failed to create expense"));
    } finally {
      setExpenseSubmitting(false);
    }
  }

  async function handleRefreshCycleFinance() {
    if (!selectedGroup || !selectedCycle || selectedCycle.groupId !== selectedGroup.id) {
      return;
    }

    setFinanceLoading(true);
    setFinanceError(null);

    try {
      const result = await loadCycleFinance(selectedGroup.id, selectedCycle.id);
      setExpenses(result.expenses);
      setMembers(result.members);
      setSettlements(result.settlements);
    } catch (error) {
      setFinanceError(formatErrorMessage(error, "Failed to refresh balances"));
    } finally {
      setFinanceLoading(false);
    }
  }

  async function handleApproveExpenseDelete(expenseID: string) {
    if (!selectedGroup || !selectedCycle) {
      return;
    }

    setExpenseDeletePendingIDs((currentIDs) =>
      currentIDs.includes(expenseID) ? currentIDs : [...currentIDs, expenseID],
    );
    setFinanceError(null);

    try {
      await approveExpenseDelete(selectedGroup.id, selectedCycle.id, expenseID);
      const result = await loadCycleFinance(selectedGroup.id, selectedCycle.id);
      setExpenses(result.expenses);
      setMembers(result.members);
      setSettlements(result.settlements);
    } catch (error) {
      setFinanceError(formatErrorMessage(error, "Failed to approve expense deletion"));
    } finally {
      setExpenseDeletePendingIDs((currentIDs) =>
        currentIDs.filter((currentExpenseID) => currentExpenseID !== expenseID),
      );
    }
  }

  function resetFinanceUIState() {
    setExpenseDeletePendingIDs([]);
    setIsCreateExpenseModalOpen(false);
    setCreateExpenseError(null);
    setFinanceError(null);
    setFinanceLoading(false);
  }

  return {
    members,
    expenses,
    settlements,
    totals,
    hasSelectedCycle,
    canAddExpense,
    expenseDeletePendingIDs,
    isCreateExpenseModalOpen,
    expenseSubmitting,
    createExpenseError,
    financeLoading,
    financeError,
    defaultPaidByWallet: walletAddress,
    handleOpenCreateExpenseModal,
    handleCloseCreateExpenseModal,
    handleSubmitCreateExpense,
    handleRefreshCycleFinance,
    handleApproveExpenseDelete,
    resetFinanceUIState,
  };
}

async function loadCycleFinance(groupID: string, cycleID: string) {
  const [expensesResult, summaryResult] = await Promise.all([
    fetchCycleExpenses(groupID, cycleID),
    fetchSettlementSummary(groupID, cycleID),
  ]);

  return {
    expenses: expensesResult.expenses,
    members: summaryResult.summary.members,
    settlements: summaryResult.summary.settlements,
  };
}
