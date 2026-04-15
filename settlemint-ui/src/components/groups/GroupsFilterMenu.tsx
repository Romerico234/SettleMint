import type { GroupFilterMode, GroupSortMode } from "../../shared/types";
import "./GroupsFilterMenu.css";

type GroupsFilterMenuProps = {
  isOpen: boolean;
  filterMode: GroupFilterMode;
  sortMode: GroupSortMode;
  onFilterChange: (value: GroupFilterMode) => void;
  onSortChange: (value: GroupSortMode) => void;
};

const filterOptions: Array<{ value: GroupFilterMode; label: string; description: string }> = [
  { value: "all", label: "All Groups", description: "Show every group you belong to." },
  { value: "owned", label: "Owner", description: "Only show groups you created." },
  { value: "member", label: "Regular Member", description: "Only show groups you joined." },
];

const sortOptions: Array<{ value: GroupSortMode; label: string; description: string }> = [
  { value: "date", label: "By Date", description: "Newest groups appear first." },
  { value: "name", label: "By Name", description: "Sort groups alphabetically." },
];

export default function GroupsFilterMenu({
  isOpen,
  filterMode,
  sortMode,
  onFilterChange,
  onSortChange,
}: GroupsFilterMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="groups-filter-menu" role="menu" aria-label="Group filters">
      <div className="groups-filter-menu-section">
        <div className="groups-filter-menu-label">Filter</div>
        <div className="groups-filter-menu-list">
          {filterOptions.map((option) => {
            const isActive = option.value === filterMode;

            return (
              <button
                key={option.value}
                className={`groups-filter-menu-option ${isActive ? "active" : ""}`}
                type="button"
                onClick={() => onFilterChange(option.value)}
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

      <div className="groups-filter-menu-divider" />

      <div className="groups-filter-menu-section">
        <div className="groups-filter-menu-label">Sort</div>
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
