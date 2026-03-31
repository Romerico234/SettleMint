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
          {archivedCycles.length > 0 ? (
            archivedCycles.map((cycle) => (
              <div key={cycle.id} className="archive-card">
                <div>
                  <div className="archive-title">{cycle.name}</div>
                  <div className="archive-meta">
                    Archived cycle • {cycle.createdAt}
                  </div>
                </div>
                <div className="archive-actions">
                  <button className="btn btn-secondary btn-small">
                    View History
                  </button>
                  <button className="btn btn-ghost-muted btn-small">
                    Export
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No archived cycles yet.
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Verified Transactions</h2>
            <p className="panel-subtitle">
              Completed settlement proof will appear here once loaded from the backend.
            </p>
          </div>
        </div>

        <div className="proof-card empty-state">
          No verified transaction data available.
        </div>
      </section>
    </div>
  );
}