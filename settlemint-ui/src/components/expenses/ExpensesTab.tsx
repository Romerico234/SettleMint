import type { Expense } from "../../shared/types";
import "./ExpensesTab.css";

type ExpensesTabProps = {
  expenses: Expense[];
};

export default function ExpensesTab({ expenses }: ExpensesTabProps) {
  return (
    <div className="content-grid-single">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Expense Ledger</h2>
            <p className="panel-subtitle">
              Record who paid, how much was spent, and how the cost should be split.
            </p>
          </div>
          <button className="btn btn-primary">Add New Expense</button>
        </div>

        <div className="expense-table">
          <div className="table-header">
            <span>Expense</span>
            <span>Paid By</span>
            <span>Split</span>
            <span>Date</span>
            <span>Amount</span>
          </div>

          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <div key={expense.id} className="table-row">
                <span>{expense.title}</span>
                <span>{expense.paidBy}</span>
                <span>{expense.splitType}</span>
                <span>{expense.date}</span>
                <span>${expense.amount.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No expenses yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}