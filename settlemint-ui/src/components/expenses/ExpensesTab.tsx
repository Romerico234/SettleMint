import type { Expense } from "../../shared/types";

type ExpensesTabProps = {
  expenses: Expense[];
};

export default function ExpensesTab({ expenses }: ExpensesTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Expenses</h3>
            <p className="section-card-copy">Track group spending in one place.</p>
          </div>
          <button className="primary-chip" type="button">
            Add Expense
          </button>
        </div>
        {expenses.length > 0 ? (
          <div className="simple-list">
            {expenses.map((expense) => (
              <div className="simple-row" key={expense.id}>
                <div>
                  <strong>{expense.description}</strong>
                  <p className="row-copy">Paid by {expense.paidBy}</p>
                </div>
                <strong>${expense.amount.toFixed(2)}</strong>
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
