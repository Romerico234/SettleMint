import "./Header.css";

type HeaderProps = {
  actionsDisabled?: boolean;
  showSettlementCycleAction?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showActions?: boolean;
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
  onCreateSettlementPeriod?: () => void;
};

export default function Header({
  actionsDisabled = false,
  showSettlementCycleAction = false,
  eyebrow = "SettleMint Dashboard",
  title = "Group settlement, with proof on-chain.",
  subtitle = "Record expenses, compute a minimal settlement plan, and verify repayment with blockchain transaction proof.",
  showActions = true,
  onCreateGroup,
  onJoinGroup,
  onCreateSettlementPeriod,
}: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="page-eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      {showActions && (
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
      )}
    </header>
  );
}
