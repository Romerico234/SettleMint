import { useMemo, useState } from "react";
import "./App.css";

import { badgesSeed, cyclesSeed, expensesSeed, membersSeed, settlementsSeed } from "./shared/mock-data";
import type { Cycle, Tab } from "./shared/types";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import HeroSection from "./components/main/HeroSection";
import OverviewTab from "./components/main/OverviewTab";
import ExpensesTab from "./components/expenses/ExpensesTab";
import SettlementPlanTab from "./components/settlement/SettlementPlanTab";
import ArchiveTab from "./components/archive/ArchiveTab";

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<Cycle>(cyclesSeed[0]);
  const [selectedTab, setSelectedTab] = useState<Tab>("Overview");

  const activeMembers = membersSeed;
  const activeExpenses = expensesSeed;
  const activeSettlements = settlementsSeed;
  const archivedCycles = cyclesSeed.filter((cycle) => cycle.status === "Archived");

  const totals = useMemo(() => {
    const expenseTotal = activeExpenses.reduce((sum, item) => sum + item.amount, 0);
    const pendingCount = activeSettlements.filter((s) => s.status === "Pending").length;
    const verifiedCount = activeSettlements.filter((s) => s.status === "Verified").length;

    return {
      expenseTotal,
      pendingCount,
      verifiedCount,
    };
  }, [activeExpenses, activeSettlements]);

  return (
    <div className="app-page">
      <div className="app-glow app-glow-one" />
      <div className="app-glow app-glow-two" />

      <div className="app-shell">
        <Sidebar
          walletConnected={walletConnected}
          onToggleWallet={() => setWalletConnected((prev) => !prev)}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          cycles={cyclesSeed}
          selectedCycle={selectedCycle}
          setSelectedCycle={setSelectedCycle}
        />

        <main className="app-main">
          <Header />

          <HeroSection
            members={activeMembers}
            selectedCycle={selectedCycle}
            expenseTotal={totals.expenseTotal}
            pendingCount={totals.pendingCount}
            verifiedCount={totals.verifiedCount}
          />

          {selectedTab === "Overview" && (
            <OverviewTab
              members={activeMembers}
              expenses={activeExpenses}
              badges={badgesSeed}
            />
          )}

          {selectedTab === "Expenses" && <ExpensesTab expenses={activeExpenses} />}

          {selectedTab === "Settlement Plan" && (
            <SettlementPlanTab settlements={activeSettlements} />
          )}

          {selectedTab === "Archive" && (
            <ArchiveTab archivedCycles={archivedCycles} />
          )}
        </main>
      </div>
    </div>
  );
}