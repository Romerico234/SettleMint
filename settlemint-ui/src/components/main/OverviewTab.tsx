import type { Badge, Expense, Member } from "../../shared/types";

type OverviewTabProps = {
  members: Member[];
  expenses: Expense[];
  badges: Badge[];
  hasSelectedCycle: boolean;
  loading: boolean;
  errorMessage: string | null;
  canAddExpense: boolean;
  onRefreshBalances: () => void;
  onAddExpense: () => void;
};

export default function OverviewTab({
  members,
  expenses,
  badges,
  hasSelectedCycle,
  loading,
  errorMessage,
  canAddExpense,
  onRefreshBalances,
  onAddExpense,
}: OverviewTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Running Balances</h3>
            <p className="section-card-copy">
              Positive means they are owed, negative means they owe.
            </p>
          </div>
          <button className="ghost-button" type="button" onClick={onRefreshBalances} disabled={!hasSelectedCycle || loading}>
            Refresh Balances
          </button>
        </div>
        {errorMessage && <p className="section-error">{errorMessage}</p>}
        {loading ? (
          <p className="empty-copy">Refreshing balances and settlement data...</p>
        ) : !hasSelectedCycle ? (
          <p className="empty-copy">Select a Settlement Cycle to compute balances.</p>
        ) : members.length > 0 ? (
          <div className="simple-list">
            {members.map((member) => (
              <div className="simple-row" key={member.walletAddress}>
                <div>
                  <strong>{member.displayName.trim() || shortWallet(member.walletAddress)}</strong>
                  <p className="row-copy">
                    Paid ${member.totalPaid.toFixed(2)} • Owes ${member.totalOwed.toFixed(2)}
                  </p>
                </div>
                <strong className={member.balance >= 0 ? "amount-positive" : "amount-negative"}>
                  {member.balance >= 0 ? "+" : "-"}${Math.abs(member.balance).toFixed(2)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No balances available.</p>
        )}
      </article>

      <article className="dashboard-card section-card">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Recent Expenses</h3>
            <p className="section-card-copy">Shared costs inside the active Settlement Cycle.</p>
          </div>
          <button className="primary-chip" type="button" onClick={onAddExpense} disabled={!canAddExpense}>
            Add Expense
          </button>
        </div>
        {loading ? (
          <p className="empty-copy">Loading current cycle expenses...</p>
        ) : !hasSelectedCycle ? (
          <p className="empty-copy">Select a Settlement Cycle to start adding expenses.</p>
        ) : expenses.length > 0 ? (
          <div className="simple-list">
            {expenses.slice(0, 5).map((expense) => (
              <div className="simple-row" key={expense.id}>
                <div>
                  <strong>{expense.description}</strong>
                  <p className="row-copy">
                    Paid by {expense.paidByDisplayName.trim() || shortWallet(expense.paidByWallet)}
                  </p>
                </div>
                <strong>${expense.amount.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No recent expenses.</p>
        )}
      </article>

      <article className="dashboard-card section-card section-card-wide">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Badge Progress</h3>
            <p className="section-card-copy">
              Optional on-chain achievements for engaged group members.
            </p>
          </div>
        </div>
        {badges.length > 0 ? (
          <div className="simple-list">
            {badges.map((badge) => (
              <div className="simple-row" key={badge.id}>
                <span>{badge.name}</span>
                <span>{badge.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No badges available.</p>
        )}
      </article>
    </section>
  );
}

function shortWallet(walletAddress: string) {
  if (!walletAddress) {
    return "Unknown wallet";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
}
