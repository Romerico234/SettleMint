import type { GroupMember } from "../../shared/types";

type HeroSectionProps = {
  currentGroup: {
    id: string;
    name: string;
    ownerWallet: string;
    memberCount: number;
    currentUserRole?: "owner" | "member";
  } | null;
  currentWalletAddress: string | null;
  groupMembers: GroupMember[];
  hasSelectedCycle: boolean;
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
  groupMembers,
  hasSelectedCycle,
  expenseTotal,
  pendingCount,
  verifiedCount,
  actionLoading = false,
  onLeaveGroup,
  onDeleteGroup,
}: HeroSectionProps) {
  const isOwner =
    currentGroup?.currentUserRole === "owner" ||
    (Boolean(currentGroup && currentWalletAddress) &&
      currentGroup?.ownerWallet.toLowerCase() === currentWalletAddress?.toLowerCase());

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
            <strong>{currentGroup?.memberCount ?? 0}</strong>
            <span>Members</span>
          </div>
        </div>
        <p className="highlight-card-caption">
          {currentGroup
            ? "Group balances and activity will update here as Settlement Cycles are created."
            : "Create a group to start inviting members and organizing Settlement Cycles."}
        </p>
        {currentGroup && groupMembers.length > 0 && (
          <div className="highlight-card-members">
            {groupMembers.map((member) => (
              <div className="highlight-card-member-row" key={member.walletAddress}>
                <div>
                  <div className="highlight-card-member-name">
                    {member.displayName.trim() || "Unnamed member"}
                  </div>
                  <div className="highlight-card-member-wallet">
                    {shortWallet(member.walletAddress)}
                  </div>
                </div>
                <span className={`pill ${member.role === "owner" ? "pill-active" : "pill-archived"}`}>
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
              </div>
            ))}
          </div>
        )}
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
        caption={
          hasSelectedCycle
            ? "Running total for the selected Settlement Cycle"
            : "Select a Settlement Cycle to view totals"
        }
      />
      <StatCard
        label="Pending Settlements"
        value={String(pendingCount)}
        caption="Transactions still waiting for payment"
      />
      <StatCard
        label="Verified On-Chain"
        value={String(verifiedCount)}
        caption="Settlements with stored transaction proof"
      />
    </section>
  );
}

function shortWallet(walletAddress: string) {
  if (!walletAddress) {
    return "Wallet unavailable";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
}
