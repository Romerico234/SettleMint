import "./Header.css";

type HeaderProps = {
  actionsDisabled?: boolean;
  showSettlementCycleAction?: boolean;
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
  onCreateSettlementPeriod?: () => void;
};

export default function Header({
  actionsDisabled = false,
  showSettlementCycleAction = true,
  onCreateGroup,
  onJoinGroup,
  onCreateSettlementPeriod,
}: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="page-eyebrow">SettleMint Dashboard</div>
        <h1 className="page-title">Group settlement, with proof on-chain.</h1>
        <p className="page-subtitle">
          Record expenses, compute a minimal settlement plan, and verify repayment
          with blockchain transaction proof.
        </p>
      </div>

      <div className="page-header-actions">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onCreateGroup}
          disabled={actionsDisabled}
        >
          Create Group
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onJoinGroup}
          disabled={actionsDisabled}
        >
          Join Group
        </button>
        {showSettlementCycleAction && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={onCreateSettlementPeriod}
            disabled={actionsDisabled}
          >
            New Settlement Cycle
          </button>
        )}
      </div>
    </header>
  );
}
