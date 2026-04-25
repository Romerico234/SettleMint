import type { ArchiveSortMode } from "../../shared/types";
import "../groups/GroupsFilterMenu.css";

type ArchiveFilterMenuProps = {
  isOpen: boolean;
  sortMode: ArchiveSortMode;
  alignEnd?: boolean;
  onSortChange: (value: ArchiveSortMode) => void;
};

const sortOptions: Array<{ value: ArchiveSortMode; label: string; description: string }> = [
  { value: "date", label: "By Date", description: "Most recently closed cycles appear first." },
  { value: "name", label: "By Name", description: "Sort archived cycles alphabetically." },
];

export default function ArchiveFilterMenu({
  isOpen,
  sortMode,
  alignEnd = false,
  onSortChange,
}: ArchiveFilterMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`groups-filter-menu ${alignEnd ? "groups-filter-menu-align-end" : ""}`}
      role="menu"
      aria-label="Archive filters"
    >
      <div className="groups-filter-menu-section">
        <div className="groups-filter-menu-label">Filter</div>
        <div className="groups-filter-menu-list">
          {sortOptions.map((option) => {
            const isActive = option.value === sortMode;

            return (
              <button
                key={option.value}
                className={`groups-filter-menu-option ${isActive ? "active" : ""}`}
                type="button"
                onClick={() => onSortChange(option.value)}
              >
                <div className={`groups-filter-menu-checkbox ${isActive ? "active" : ""}`}>
                  <span className="groups-filter-menu-checkbox-tick" />
                </div>
                <div className="groups-filter-menu-option-body">
                  <div className="groups-filter-menu-option-title">{option.label}</div>
                  <div className="groups-filter-menu-option-copy">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
