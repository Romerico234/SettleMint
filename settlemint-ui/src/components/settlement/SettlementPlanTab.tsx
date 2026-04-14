import type { Settlement } from "../../shared/types";

type SettlementPlanTabProps = {
  settlements: Settlement[];
};

export default function SettlementPlanTab({ settlements }: SettlementPlanTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Settlement Plan</h3>
            <p className="section-card-copy">
              The minimal repayment plan for the current Settlement Cycle will appear here.
            </p>
          </div>
        </div>
        {settlements.length > 0 ? (
          <div className="simple-list">
            {settlements.map((settlement) => (
              <div className="simple-row" key={settlement.id}>
                <span>
                  {settlement.from} to {settlement.to}
                </span>
                <strong>${settlement.amount.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No settlement plan yet.</p>
        )}
      </article>
    </section>
  );
}
