type HeroSectionProps = {
  members: { id: string }[];
  selectedCycle: { name: string } | null;
  expenseTotal: number;
  pendingCount: number;
  verifiedCount: number;
};

type StatCardProps = {
  label: string;
  value: string;
  caption: string;
};

function StatCard({ label, value, caption }: StatCardProps) {
  return (
    <article className="dashboard-card stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      <p className="stat-card-caption">{caption}</p>
    </article>
  );
}

export default function HeroSection({
  members,
  selectedCycle,
  expenseTotal,
  pendingCount,
  verifiedCount,
}: HeroSectionProps) {
  return (
    <section className="dashboard-grid dashboard-grid-hero">
      <article className="dashboard-card highlight-card">
        <div className="highlight-card-header">
          <div>
            <div className="stat-card-label">Current Group</div>
            <h2 className="highlight-card-title">
              {selectedCycle?.name || "No active settlement period"}
            </h2>
          </div>
          <div className="member-pill">
            <strong>{members.length}</strong>
            <span>Members</span>
          </div>
        </div>
        <p className="highlight-card-caption">
          {members.length > 0
            ? "Balances and activity will update inside the active settlement period."
            : "No group members loaded."}
        </p>
      </article>

      <StatCard
        label="Cycle Total"
        value={`$${expenseTotal.toFixed(2)}`}
        caption="No active settlement period selected"
      />
      <StatCard
        label="Pending Settlements"
        value={String(pendingCount)}
        caption="Transactions still waiting for payment"
      />
      <StatCard
        label="Verified On-Chain"
        value={String(verifiedCount)}
        caption="Settlements with stored tx proof"
      />
    </section>
  );
}
