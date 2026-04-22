import type { Cycle } from "../../shared/types";
import { formatDisplayDateTime } from "../../lib/appHelpers";

type ArchiveTabProps = {
  archivedCycles: Cycle[];
};

export default function ArchiveTab({ archivedCycles }: ArchiveTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Archive</h3>
            <p className="section-card-copy">
              Closed Settlement Cycles will live here with on-chain receipts.
            </p>
          </div>
        </div>
        {archivedCycles.length > 0 ? (
          <div className="simple-list">
            {archivedCycles.map((cycle) => (
              <div className="simple-row" key={cycle.id}>
                <span>{cycle.name}</span>
                <span>{formatDisplayDateTime(cycle.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No archived Settlement Cycles yet.</p>
        )}
      </article>
    </section>
  );
}
