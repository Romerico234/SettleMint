import { useEffect, useMemo, useState } from "react";
import "./App.css";

import type { Cycle, Tab, Member, Expense, Settlement, Badge } from "./shared/types";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import HeroSection from "./components/main/HeroSection";
import OverviewTab from "./components/main/OverviewTab";
import ExpensesTab from "./components/expenses/ExpensesTab";
import SettlementPlanTab from "./components/settlement/SettlementPlanTab";
import ArchiveTab from "./components/archive/ArchiveTab";
import {
  createAuthChallenge,
  fetchAuthenticatedUser,
  verifyWalletSignature,
} from "./api/auth";
import { fetchMyProfile, updateMyProfile } from "./api/users";
import { clearAuthToken, getAuthToken, setAuthToken } from "./lib/auth";
import {
  getExistingConnectedEthereumWallet,
  getWalletChainId,
  requestWalletAccess,
  signMessage,
} from "./lib/wallet";
import type { UserProfile } from "./api/users";

export default function App() {
  const [selectedTab, setSelectedTab] = useState<Tab>("Overview");
  const [accessToken, setAccessToken] = useState<string | null>(() => getAuthToken());
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [cycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

  const [members] = useState<Member[]>([]);
  const [expenses] = useState<Expense[]>([]);
  const [settlements] = useState<Settlement[]>([]);
  const [badges] = useState<Badge[]>([]);

  const archivedCycles = cycles.filter((cycle) => cycle.status === "Archived");
  const authenticatedWalletAddress = profile?.walletAddress || connectedWalletAddress;
  const walletAddress = authenticatedWalletAddress || connectedWalletAddress;

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

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      return;
    }

    let mounted = true;

    Promise.all([fetchAuthenticatedUser(), fetchMyProfile()])
      .then(([, profileResult]) => {
        if (mounted) {
          setProfile(profileResult.profile);
          setConnectedWalletAddress(profileResult.profile.walletAddress || null);
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setProfile(null);
          setAuthError(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  async function handleWalletSignIn() {
    if (accessToken && authenticatedWalletAddress) {
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const wallet =
        (await getExistingConnectedEthereumWallet()) ||
        (await requestWalletAccess());

      if (!wallet) {
        setAuthError("MetaMask or another Ethereum wallet was not detected in this browser.");
        return;
      }

      setConnectedWalletAddress(wallet.address);

      const chainId = await getWalletChainId(wallet);
      const challenge = await createAuthChallenge({
        walletAddress: wallet.address,
        domain: window.location.host,
        uri: window.location.origin,
        chainId,
      });
      const signature = await signMessage(wallet, wallet.address, challenge.message);
      const result = await verifyWalletSignature({
        walletAddress: wallet.address,
        message: challenge.message,
        signature,
      });

      setAuthToken(result.token);
      setAccessToken(result.token);
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to sign in with wallet");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setAuthError(null);
    clearAuthToken();
    setAccessToken(null);
    setProfile(null);
    setConnectedWalletAddress(null);
    setAuthLoading(false);
  }

  async function handleSaveProfile(input: {
    displayName: string;
  }) {
    setProfileSaving(true);
    setAuthError(null);

    try {
      const result = await updateMyProfile(input);
      setProfile(result.profile);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleCreateGroup() {
    setAuthError("Create Group UI is restored, but the group creation flow has not been implemented yet.");
  }

  function handleCreateSettlementPeriod() {
    setAuthError("Settlement Cycle creation UI is restored, but the backend flow has not been implemented yet.");
  }

  return (
    <div className="app-page">
      <div className="app-glow app-glow-one" />
      <div className="app-glow app-glow-two" />

      <div className="app-shell">
        <Sidebar
          walletConnected={Boolean(connectedWalletAddress)}
          walletAddress={walletAddress}
          walletLoading={authLoading}
          profile={profile}
          profileSaving={profileSaving}
          onWalletAction={handleWalletSignIn}
          onDisconnect={handleSignOut}
          onSaveProfile={handleSaveProfile}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          cycles={cycles}
          selectedCycle={selectedCycle}
          setSelectedCycle={setSelectedCycle}
        />

        <main className="app-main">
          <Header
            authError={authError}
            actionsDisabled={!accessToken}
            onCreateGroup={handleCreateGroup}
            onCreateSettlementPeriod={handleCreateSettlementPeriod}
          />

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
