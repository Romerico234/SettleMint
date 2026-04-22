import { useEffect, useRef, useState } from "react";
import type { Cycle, Group, GroupFilterMode, GroupSortMode, Tab } from "../../shared/types";
import type { UserProfile } from "../../api/users";
import filterOnIcon from "../../assets/filter-on.png";
import filterOffIcon from "../../assets/filter-off.png";
import GroupsFilterMenu from "../groups/GroupsFilterMenu";
import "./Sidebar.css";

type SidebarProps = {
  walletConnected: boolean;
  walletAddress: string | null;
  walletLoading: boolean;
  walletError: string | null;
  profile: UserProfile | null;
  profileSaving: boolean;
  onWalletAction: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSaveProfile: (input: { displayName: string }) => Promise<void>;
  selectedTab: Tab;
  setSelectedTab: (tab: Tab) => void;
  groups: Group[];
  selectedGroup: Group | null;
  setSelectedGroup: (group: Group) => void;
  groupFilterMode: GroupFilterMode;
  groupSortMode: GroupSortMode;
  onGroupFilterModeChange: (value: GroupFilterMode) => void;
  onGroupSortModeChange: (value: GroupSortMode) => void;
  cycles: Cycle[];
  selectedCycle: Cycle | null;
  setSelectedCycle: (cycle: Cycle) => void;
};

const tabs: Tab[] = ["Overview", "Expenses", "Settlement Plan", "Archive"];

export default function Sidebar({
  walletConnected,
  walletAddress,
  walletLoading,
  walletError,
  profile,
  profileSaving,
  onWalletAction,
  onDisconnect,
  onSaveProfile,
  selectedTab,
  setSelectedTab,
  groups,
  selectedGroup,
  setSelectedGroup,
  groupFilterMode,
  groupSortMode,
  onGroupFilterModeChange,
  onGroupSortModeChange,
  cycles,
  selectedCycle,
  setSelectedCycle,
}: SidebarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [isGroupsFilterMenuOpen, setIsGroupsFilterMenuOpen] = useState(false);
  const groupsFilterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDisplayNameDraft(profile?.displayName || "");
  }, [profile?.displayName]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        groupsFilterMenuRef.current &&
        !groupsFilterMenuRef.current.contains(event.target as Node)
      ) {
        setIsGroupsFilterMenuOpen(false);
      }
    }

    if (isGroupsFilterMenuOpen) {
      window.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isGroupsFilterMenuOpen]);

  async function handleSaveDisplayName() {
    await onSaveProfile({ displayName: displayNameDraft.trim() });
    setIsEditingName(false);
  }

  async function handleCopyInviteCode(group: Group) {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopiedGroupId(group.id);
      window.setTimeout(() => {
        setCopiedGroupId((currentGroupId) => (currentGroupId === group.id ? null : currentGroupId));
      }, 1800);
    } catch {
      setCopiedGroupId(null);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand-card">
        <div className="sidebar-brand-icon">S</div>
        <div>
          <div className="sidebar-brand-title">SettleMint</div>
          <div className="sidebar-brand-subtitle">
            Verifiable group expense settlement
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>

        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`sidebar-nav-button ${selectedTab === tab ? "active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Wallet</div>

        <div className="sidebar-wallet-card">
          <div className="sidebar-wallet-status-row">
            <span
              className={`sidebar-status-dot ${
                walletConnected ? "connected" : "disconnected"
              }`}
            />
            <span className="sidebar-wallet-status-text">
              {walletConnected ? "Connected" : "Not Connected"}
            </span>
          </div>

          {walletConnected && (
            <>
              <div className="sidebar-display-name-row">
                <div className="sidebar-display-name-copy">
                  <div className="sidebar-display-name-label">Display Name</div>
                  {!isEditingName && (
                    <div className="sidebar-display-name-value">
                      {profile?.displayName || "Add a display name"}
                    </div>
                  )}
                </div>

                {!isEditingName && (
                  <button
                    className="sidebar-inline-action"
                    type="button"
                    onClick={() => setIsEditingName(true)}
                  >
                    {profile?.displayName ? "Edit" : "Add"}
                  </button>
                )}
              </div>

              {isEditingName && (
                <div className="sidebar-display-name-editor">
                  <input
                    className="sidebar-display-name-input"
                    type="text"
                    value={displayNameDraft}
                    onChange={(event) => setDisplayNameDraft(event.target.value)}
                    placeholder="Display name"
                    maxLength={80}
                  />
                  <div className="sidebar-display-name-actions">
                    <button
                      className="sidebar-inline-action"
                      type="button"
                      onClick={() => {
                        setDisplayNameDraft(profile?.displayName || "");
                        setIsEditingName(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="sidebar-inline-action sidebar-inline-action-primary"
                      type="button"
                      onClick={() => void handleSaveDisplayName()}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="sidebar-wallet-address">{walletAddress || "MetaMask wallet required"}</div>

          {!walletConnected && (
            <button className="btn btn-primary" onClick={() => void onWalletAction()} disabled={walletLoading}>
              Connect Wallet
            </button>
          )}

          {walletConnected && (
            <button className="btn btn-secondary" onClick={() => void onDisconnect()} disabled={walletLoading}>
              Sign out
            </button>
          )}

          {walletError && <p className="sidebar-wallet-error">{walletError}</p>}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <div className="sidebar-section-label">Groups</div>
          <div className="sidebar-filter-anchor" ref={groupsFilterMenuRef}>
            <button
              className={`sidebar-filter-toggle ${
                isGroupsFilterMenuOpen || groupFilterMode !== "all" || groupSortMode !== "date"
                  ? "active"
                  : ""
              }`}
              type="button"
              onClick={() => setIsGroupsFilterMenuOpen((currentValue) => !currentValue)}
              title="Open group filters"
              aria-label="Open group filters"
              aria-expanded={isGroupsFilterMenuOpen}
            >
              <img
                src={
                  isGroupsFilterMenuOpen
                    ? filterOffIcon
                    : filterOnIcon
                }
                alt=""
                className="sidebar-filter-toggle-icon"
              />
            </button>
            <GroupsFilterMenu
              isOpen={isGroupsFilterMenuOpen}
              filterMode={groupFilterMode}
              sortMode={groupSortMode}
              onFilterChange={(value) => {
                onGroupFilterModeChange(value);
                setIsGroupsFilterMenuOpen(false);
              }}
              onSortChange={(value) => {
                onGroupSortModeChange(value);
                setIsGroupsFilterMenuOpen(false);
              }}
            />
          </div>
        </div>

        <div className="sidebar-cycle-list">
          {groups.length > 0 ? (
            groups.map((group) => {
              const isSelected = selectedGroup?.id === group.id;

              return (
                <div
                  key={group.id}
                  className={`sidebar-cycle-button sidebar-group-card ${isSelected ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedGroup(group)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedGroup(group);
                    }
                  }}
                >
                  <div className="sidebar-cycle-button-top">
                    <span>{group.name}</span>
                    <span className="pill pill-active">Active</span>
                  </div>
                  <div className="sidebar-group-invite-row">
                    <span className="sidebar-cycle-date">Invite Code</span>
                    {copiedGroupId === group.id && (
                      <span className="sidebar-group-copy-feedback">Copied</span>
                    )}
                  </div>
                  <button
                    className="sidebar-group-invite-link"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCopyInviteCode(group);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    title="Copy invite code"
                  >
                    {group.inviteCode}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              {groupFilterMode === "owned"
                ? "No owned groups match this filter."
                : groupFilterMode === "member"
                  ? "No member groups match this filter."
                  : "No groups yet."}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Settlement Cycles</div>

        <div className="sidebar-cycle-list">
          {cycles.length > 0 ? (
            cycles.map((cycle) => {
              const isSelected = selectedCycle?.id === cycle.id;

              return (
                <button
                  key={cycle.id}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`sidebar-cycle-button ${isSelected ? "active" : ""}`}
                >
                  <div className="sidebar-cycle-button-top">
                    <span>{cycle.name}</span>
                    <span
                      className={`pill ${
                        cycle.status === "Active" ? "pill-active" : "pill-archived"
                      }`}
                    >
                      {cycle.status}
                    </span>
                  </div>
                  <div className="sidebar-cycle-date">{cycle.createdAt}</div>
                </button>
              );
            })
          ) : (
            <div className="empty-state">No Settlement Cycles yet.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
