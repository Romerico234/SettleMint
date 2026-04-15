type HeroSectionProps = {
  currentGroup: { id: string; name: string; ownerWallet: string } | null;
  currentWalletAddress: string | null;
  members: { id: string }[];
  expenseTotal: number;
  pendingCount: number;
  verifiedCount: number;
  actionLoading?: boolean;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
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
  currentGroup,
  currentWalletAddress,
  members,
  expenseTotal,
  pendingCount,
  verifiedCount,
  actionLoading = false,
  onLeaveGroup,
  onDeleteGroup,
}: HeroSectionProps) {
  const isOwner =
    Boolean(currentGroup && currentWalletAddress) &&
    currentGroup?.ownerWallet.toLowerCase() === currentWalletAddress?.toLowerCase();

  return (
    <section className="dashboard-grid dashboard-grid-hero">
      <article className="dashboard-card highlight-card">
        <div className="highlight-card-header">
          <div>
            <div className="stat-card-label">Current Group</div>
            <h2 className="highlight-card-title">
              {currentGroup?.name || "No active Group"}
            </h2>
          </div>
          <div className="member-pill">
            <strong>{members.length}</strong>
            <span>Members</span>
          </div>
        </div>
        <p className="highlight-card-caption">
          {currentGroup
            ? "Group balances and activity will update here as Settlement Cycles are created."
            : "Create a group to start inviting members and organizing Settlement Cycles."}
        </p>
        {currentGroup && (
          <div className="highlight-card-actions">
            {isOwner ? (
              <button
                className="btn btn-secondary highlight-card-action-button"
                type="button"
                onClick={onDeleteGroup}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete Group"}
              </button>
            ) : (
              <button
                className="btn btn-secondary highlight-card-action-button"
                type="button"
                onClick={onLeaveGroup}
                disabled={actionLoading}
              >
                {actionLoading ? "Leaving..." : "Leave Group"}
              </button>
            )}
          </div>
        )}
      </article>

      <StatCard
        label="Settlement Cycle Total"
        value={`$${expenseTotal.toFixed(2)}`}
        caption="No active Settlement Cycle selected"
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
