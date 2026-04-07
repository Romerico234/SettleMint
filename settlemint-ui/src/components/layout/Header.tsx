import "./Header.css";

type HeaderProps = {
  authError: string | null;
};

export default function Header({ authError }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="page-eyebrow">SettleMint Dashboard</div>
        <h1 className="page-title">Group settlement, with proof on-chain.</h1>
        <p className="page-subtitle">
          Record expenses, compute a minimal settlement plan, and verify repayment
          with blockchain transaction proof.
        </p>

        {authError && <p className="page-inline-error">{authError}</p>}
      </div>
    </header>
  );
}
