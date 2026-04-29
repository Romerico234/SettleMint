import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveSortMode, CycleArchive } from "../../shared/types";
import { fetchArchiveSnapshot } from "../../api/cycles";
import { formatDisplayDateTime } from "../../lib/appHelpers";
import filterOnIcon from "../../assets/filter-on.png";
import filterOffIcon from "../../assets/filter-off.png";
import ArchiveFilterMenu from "./ArchiveFilterMenu";

type ArchiveTabProps = {
  archivedCycles: CycleArchive[];
};

export default function ArchiveTab({ archivedCycles }: ArchiveTabProps) {
  const [sortMode, setSortMode] = useState<ArchiveSortMode>("date");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [downloadingArchiveID, setDownloadingArchiveID] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }

    if (isFilterMenuOpen) {
      window.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isFilterMenuOpen]);

  const visibleArchives = useMemo(() => {
    const nextArchives = [...archivedCycles];

    if (sortMode === "name") {
      return nextArchives.sort((leftArchive, rightArchive) =>
        leftArchive.cycleName.localeCompare(rightArchive.cycleName),
      );
    }

    return nextArchives.sort(
      (leftArchive, rightArchive) =>
        new Date(rightArchive.closedAt).getTime() - new Date(leftArchive.closedAt).getTime(),
    );
  }, [archivedCycles, sortMode]);

  async function handleOpenArchiveJSON(archiveID: string) {
    setDownloadingArchiveID(archiveID);

    try {
      const snapshot = await fetchArchiveSnapshot(archiveID);
      const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const objectURL = window.URL.createObjectURL(file);
      window.open(objectURL, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(objectURL), 60_000);
    } finally {
      setDownloadingArchiveID((currentArchiveID) =>
        currentArchiveID === archiveID ? null : currentArchiveID,
      );
    }
  }

  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Archive</h3>
            <p className="section-card-copy">
              Closed Settlement Cycles live here with their archived summary and storage reference.
            </p>
          </div>
          <div className="sidebar-filter-anchor" ref={filterMenuRef}>
            <button
              className={`sidebar-filter-toggle ${isFilterMenuOpen ? "active" : ""}`}
              type="button"
              onClick={() => setIsFilterMenuOpen((currentValue) => !currentValue)}
              title="Open archive filters"
              aria-label="Open archive filters"
              aria-expanded={isFilterMenuOpen}
            >
              <img
                src={isFilterMenuOpen ? filterOffIcon : filterOnIcon}
                alt=""
                className="sidebar-filter-toggle-icon"
              />
            </button>
            <ArchiveFilterMenu
              isOpen={isFilterMenuOpen}
              sortMode={sortMode}
              alignEnd
              onSortChange={(value) => {
                setSortMode(value);
                setIsFilterMenuOpen(false);
              }}
            />
          </div>
        </div>
        {visibleArchives.length > 0 ? (
          <div className="simple-list archive-list-scroll">
            {visibleArchives.map((cycle) => (
              <div className="simple-row" key={cycle.id}>
                <div>
                  <strong>{cycle.cycleName}</strong>
                  <p className="row-copy">Archive CID: {cycle.archiveCid}</p>
                  <p className="row-copy">
                    <button
                      className="settlement-transaction-link"
                      type="button"
                      onClick={() => void handleOpenArchiveJSON(cycle.id)}
                      disabled={downloadingArchiveID === cycle.id}
                    >
                      {downloadingArchiveID === cycle.id ? "Opening..." : "Archive JSON"}
                    </button>
                  </p>
                </div>
                <span>{formatDisplayDateTime(cycle.closedAt)}</span>
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
