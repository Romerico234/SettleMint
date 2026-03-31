import type { Cycle } from "../../shared/types";
import "./ArchiveTab.css";

type ArchiveTabProps = {
  archivedCycles: Cycle[];
};

export default function ArchiveTab({ archivedCycles }: ArchiveTabProps) {
  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Archived Cycles</h2>
            <p className="panel-subtitle">
              Locked history with stored proof of settlement.
            </p>
          </div>
        </div>

        <div className="archive-list">
          {archivedCycles.map((cycle) => (
            <div key={cycle.id} className="archive-card">
              <div>
                <div className="archive-title">{cycle.name}</div>
                <div className="archive-meta">Archived cycle • {cycle.createdAt}</div>
              </div>
              <div className="archive-actions">
                <button className="btn btn-secondary btn-small">View History</button>
                <button className="btn btn-ghost-muted btn-small">Export</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Sample Verified Transaction</h2>
            <p className="panel-subtitle">
              Permanent proof linked to a completed settlement.
            </p>
          </div>
        </div>

        <div className="proof-card">
          <div className="proof-row">
            <span className="proof-label">From</span>
            <span className="proof-value">Rayquan</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">To</span>
            <span className="proof-value">Romerico</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">Amount</span>
            <span className="proof-value">$24.25</span>
          </div>
          <div className="proof-row">
            <span className="proof-label">Transaction Hash</span>
            <span className="proof-hash">
              0x4ea8d10b92f14fd2c7a53a1e5f31fbe77b98ab7123cf8afcb5da4420f0931abc
            </span>
          </div>
          <div className="proof-row">
            <span className="proof-label">Verification Status</span>
            <span className="pill pill-verified">Verified</span>
          </div>
        </div>
      </section>
    </div>
  );
}