import type { Expense } from "../../shared/types";

type ExpensesTabProps = {
  expenses: Expense[];
  selectedCycleName: string | null;
  loading: boolean;
  errorMessage: string | null;
  canAddExpense: boolean;
  deletingExpenseIDs: string[];
  onAddExpense: () => void;
  onApproveDelete: (expenseID: string) => void;
};

export default function ExpensesTab({
  expenses,
  selectedCycleName,
  loading,
  errorMessage,
  canAddExpense,
  deletingExpenseIDs,
  onAddExpense,
  onApproveDelete,
}: ExpensesTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Expenses</h3>
            <p className="section-card-copy">
              {selectedCycleName
                ? `Track shared spending for ${selectedCycleName}.`
                : "Select a Settlement Cycle to track shared spending."}
            </p>
          </div>
          <button className="primary-chip" type="button" onClick={onAddExpense} disabled={!canAddExpense}>
            Add Expense
          </button>
        </div>
        {errorMessage && <p className="section-error">{errorMessage}</p>}
        {loading ? (
          <p className="empty-copy">Loading expenses...</p>
        ) : !selectedCycleName ? (
          <p className="empty-copy">Choose a Settlement Cycle to view and add expenses.</p>
        ) : expenses.length > 0 ? (
          <div className="simple-list">
            {expenses.map((expense) => (
              <div className="simple-row simple-row-stack" key={expense.id}>
                <div className="expense-row-top">
                  <div>
                    <strong>{expense.description}</strong>
                    <p className="row-copy">
                      Paid by {expense.paidByDisplayName.trim() || shortWallet(expense.paidByWallet)} on{" "}
                      {formatDate(expense.createdAt)}
                    </p>
                    {expense.deletePending && (
                      <p className="expense-delete-copy">
                        Delete approvals: {expense.deleteApprovalCount}/{expense.deleteRequiredApprovalCount}.{" "}
                        The expense is removed automatically once everyone approves.
                      </p>
                    )}
                  </div>
                  <div className="expense-row-actions">
                    <strong>${expense.amount.toFixed(2)}</strong>
                    <button
                      className={`ghost-button expense-delete-button ${
                        expense.deleteApprovedByCurrentUser ? "approved" : ""
                      }`}
                      type="button"
                      onClick={() => onApproveDelete(expense.id)}
                      disabled={
                        deletingExpenseIDs.includes(expense.id) ||
                        expense.deleteApprovedByCurrentUser
                      }
                    >
                      {deletingExpenseIDs.includes(expense.id)
                        ? "Saving..."
                        : expense.deleteApprovedByCurrentUser
                          ? `Approved ${expense.deleteApprovalCount}/${expense.deleteRequiredApprovalCount}`
                          : expense.deletePending
                            ? `Approve Delete ${expense.deleteApprovalCount}/${expense.deleteRequiredApprovalCount}`
                            : "Request Delete"}
                    </button>
                  </div>
                </div>
                <div className="expense-splits">
                  {expense.splits.map((split) => (
                    <span className="expense-split-pill" key={`${expense.id}-${split.walletAddress}`}>
                      {split.displayName.trim() || shortWallet(split.walletAddress)}: ${split.amount.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No expenses have been added yet.</p>
        )}
      </article>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function shortWallet(walletAddress: string) {
  if (!walletAddress) {
    return "Unknown wallet";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
}
