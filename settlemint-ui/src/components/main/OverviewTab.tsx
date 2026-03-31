import type { Badge, Expense, Member } from "../../shared/types";
import { formatCurrency } from "../../shared/utils";
import "./OverviewTab.css";

type OverviewTabProps = {
  members: Member[];
  expenses: Expense[];
  badges: Badge[];
};

export default function OverviewTab({ members, expenses, badges }: OverviewTabProps) {
  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Running Balances</h2>
            <p className="panel-subtitle">
              Positive means they are owed, negative means they owe.
            </p>
          </div>
          <button className="btn btn-ghost">Refresh Balances</button>
        </div>

        <div className="balance-list">
          {members.length > 0 ? (
            members.map((member) => {
              const positive = member.balance >= 0;

              return (
                <div key={member.id} className="balance-card">
                  <div className="balance-card-left">
                    <div className="avatar avatar-large">{member.avatar}</div>
                    <div>
                      <div className="balance-name">{member.name}</div>
                      <div className="balance-wallet">{member.wallet}</div>
                    </div>
                  </div>

                  <div className={`balance-amount ${positive ? "positive" : "negative"}`}>
                    {positive ? "+" : "-"}
                    {formatCurrency(member.balance)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">No balances available.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Recent Expenses</h2>
            <p className="panel-subtitle">Shared costs inside the active cycle.</p>
          </div>
          <button className="btn btn-primary btn-small">Add Expense</button>
        </div>

        <div className="expense-list">
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <div key={expense.id} className="expense-row">
                <div>
                  <div className="expense-title">{expense.title}</div>
                  <div className="expense-meta">
                    Paid by {expense.paidBy} • {expense.splitType} split • {expense.date}
                  </div>
                </div>
                <div className="expense-right">
                  <div className="expense-amount">${expense.amount.toFixed(2)}</div>
                  <div className="expense-participants">
                    {expense.participants.join(", ")}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No recent expenses.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Badge Progress</h2>
            <p className="panel-subtitle">
              Optional on-chain achievements for engaged group members.
            </p>
          </div>
        </div>

        <div className="badge-grid">
          {badges.length > 0 ? (
            badges.map((badge) => (
              <div key={badge.id} className="badge-card">
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-description">{badge.description}</div>
              </div>
            ))
          ) : (
            <div className="empty-state">No badges available.</div>
          )}
        </div>
      </section>
    </div>
  );
}