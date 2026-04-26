import { useEffect, useMemo, useRef, useState } from "react";
import { fetchArchiveCycleJSON } from "../../api/cycles";
import type { ArchiveSortMode, CycleArchive } from "../../shared/types";
import filterOnIcon from "../../assets/filter-on.png";
import filterOffIcon from "../../assets/filter-off.png";
import ArchiveFilterMenu from "./ArchiveFilterMenu";

type ArchiveTabProps = {
  groupID: string;
  archivedCycles: CycleArchive[];
};

export default function ArchiveTab({ groupID, archivedCycles }: ArchiveTabProps) {
  const [sortMode, setSortMode] = useState<ArchiveSortMode>("date");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [openingArchiveID, setOpeningArchiveID] = useState<string | null>(null);
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
    if (!groupID || openingArchiveID) {
      return;
    }

    const archiveWindow = window.open("", "_blank");
    setOpeningArchiveID(archiveID);

    try {
      const archiveBlob = await fetchArchiveCycleJSON(groupID, archiveID);
      const archiveURL = URL.createObjectURL(archiveBlob);

      if (archiveWindow) {
        archiveWindow.location.href = archiveURL;
      } else {
        window.open(archiveURL, "_blank");
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(archiveURL);
      }, 60_000);
    } catch (error) {
      if (archiveWindow) {
        archiveWindow.close();
      }

      const message =
        error instanceof Error ? error.message : "Failed to load archived cycle JSON";
      window.alert(message);
    } finally {
      setOpeningArchiveID(null);
    }
  }

  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Archive</h3>
            <p className="section-card-copy">Closed Settlement Cycles live here.</p>
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
                <button
                  className="settlement-transaction-link"
                  type="button"
                  onClick={() => void handleOpenArchiveJSON(cycle.id)}
                  disabled={openingArchiveID === cycle.id}
                >
                  {openingArchiveID === cycle.id ? "Opening Archive JSON..." : "Archive JSON"}
                </button>
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
