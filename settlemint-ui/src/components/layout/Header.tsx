import "./Header.css";

export default function Header() {
  return (
    <header className="page-header">
      <div>
        <div className="page-eyebrow">Settlmint Dashboard</div>
        <h1 className="page-title">Group settlement, with proof on-chain.</h1>
        <p className="page-subtitle">
          Record expenses, compute a minimal settlement plan, and verify repayment
          with blockchain transaction proof.
        </p>
      </div>

      <div className="page-header-actions">
        <button className="btn btn-secondary">Create Group</button>
        <button className="btn btn-primary">New Settlement Period</button>
      </div>
    </header>
  );
}