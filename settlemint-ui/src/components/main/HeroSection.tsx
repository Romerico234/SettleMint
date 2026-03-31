import type { Cycle, Member } from "../../shared/types";
import "./HeroSection.css";

type HeroSectionProps = {
  members: Member[];
  selectedCycle: Cycle | null;
  expenseTotal: number;
  pendingCount: number;
  verifiedCount: number;
};

export default function HeroSection({
  members,
  selectedCycle,
  expenseTotal,
  pendingCount,
  verifiedCount,
}: HeroSectionProps) {
  return (
    <section className="hero-grid">
      <div className="hero-card">
        <div className="hero-card-header">
          <div>
            <div className="hero-title">Current Group</div>
            <div className="hero-value">
              {selectedCycle ? selectedCycle.name : "No active settlement period"}
            </div>
          </div>
          <div className="hero-group-badge">{members.length} Members</div>
        </div>

        <div className="hero-member-row">
          {members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="hero-member-chip">
                <div className="avatar">{member.avatar}</div>
                <div>
                  <div className="hero-member-name">{member.name}</div>
                  <div className="hero-member-wallet">{member.wallet}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No group members loaded.</div>
          )}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Cycle Total</div>
        <div className="stat-value">${expenseTotal.toFixed(2)}</div>
        <div className="stat-subtext">
          {selectedCycle
            ? `Expenses recorded in ${selectedCycle.name}`
            : "No active settlement period selected"}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Pending Settlements</div>
        <div className="stat-value">{pendingCount}</div>
        <div className="stat-subtext">Transactions still waiting for payment</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Verified On-Chain</div>
        <div className="stat-value">{verifiedCount}</div>
        <div className="stat-subtext">Settlements with stored tx proof</div>
      </div>
    </section>
  );
}