import { useMemo, useState } from "react";
import "./App.css";

import type { Cycle, Tab, Member, Expense, Settlement, Badge } from "./shared/types";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import HeroSection from "./components/main/HeroSection";
import OverviewTab from "./components/main/OverviewTab";
import ExpensesTab from "./components/expenses/ExpensesTab";
import SettlementPlanTab from "./components/settlement/SettlementPlanTab";
import ArchiveTab from "./components/archive/ArchiveTab";

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab>("Overview");

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  const archivedCycles = cycles.filter((cycle) => cycle.status === "Archived");

  const totals = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const pendingCount = settlements.filter((s) => s.status === "Pending").length;
    const verifiedCount = settlements.filter((s) => s.status === "Verified").length;

    return {
      expenseTotal,
      pendingCount,
      verifiedCount,
    };
  }, [expenses, settlements]);

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
          cycles={cycles}
          selectedCycle={selectedCycle}
          setSelectedCycle={setSelectedCycle}
        />

        <main className="app-main">
          <Header />

          <HeroSection
            members={members}
            selectedCycle={selectedCycle}
            expenseTotal={totals.expenseTotal}
            pendingCount={totals.pendingCount}
            verifiedCount={totals.verifiedCount}
          />

          {selectedTab === "Overview" && (
            <OverviewTab members={members} expenses={expenses} badges={badges} />
          )}

          {selectedTab === "Expenses" && <ExpensesTab expenses={expenses} />}

          {selectedTab === "Settlement Plan" && (
            <SettlementPlanTab settlements={settlements} />
          )}

          {selectedTab === "Archive" && (
            <ArchiveTab archivedCycles={archivedCycles} />
          )}
        </main>
      </div>
    </div>
  );
}