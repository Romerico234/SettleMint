import type { Cycle, Tab } from "../../shared/types";
import "./Sidebar.css";

type SidebarProps = {
  walletConnected: boolean;
  onToggleWallet: () => void;
  selectedTab: Tab;
  setSelectedTab: (tab: Tab) => void;
  cycles: Cycle[];
  selectedCycle: Cycle | null;
  setSelectedCycle: (cycle: Cycle) => void;
};

const tabs: Tab[] = ["Overview", "Expenses", "Settlement Plan", "Archive"];

export default function Sidebar({
  walletConnected,
  onToggleWallet,
  selectedTab,
  setSelectedTab,
  cycles,
  selectedCycle,
  setSelectedCycle,
}: SidebarProps) {
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

          <button className="btn btn-primary" onClick={onToggleWallet}>
            {walletConnected ? "Disconnect Wallet" : "Connect Wallet"}
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Settlement Periods</div>

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
            <div className="empty-state">No settlement periods yet.</div>
          )}
        </div>
      </div>
    </aside>
  );
}