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
import { fetchAuthenticatedUser } from "./api/client";
import { fetchMyProfile, updateMyProfile } from "./api/users";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  createSiweMessage,
  getExistingConnectedEthereumWallet,
  getWalletChainId,
  requestWalletAccess,
  signMessage,
} from "./lib/wallet";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "./api/users";

export default function App() {
  const [selectedTab, setSelectedTab] = useState<Tab>("Overview");
  const [session, setSession] = useState<Session | null>(null);
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
  const authenticatedWalletAddress =
    profile?.walletAddress || session?.user?.identities?.[0]?.identity_data?.address || null;
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
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
        return;
      }

      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      setConnectedWalletAddress(null);
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
  }, [session?.access_token]);

  async function handleWalletSignIn() {
    if (session?.access_token && authenticatedWalletAddress) {
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    const wallet =
      (await getExistingConnectedEthereumWallet()) ||
      (await requestWalletAccess());

    if (!wallet) {
      setAuthLoading(false);
      setAuthError("MetaMask or another Ethereum wallet was not detected in this browser.");
      return;
    }

    setConnectedWalletAddress(wallet.address);

    const chainId = await getWalletChainId(wallet);
    const message = createSiweMessage({
      domain: window.location.host,
      address: wallet.address,
      uri: window.location.origin,
      chainId,
      statement: "Sign in to SettleMint with your wallet.",
    });
    const signature = await signMessage(wallet, wallet.address, message);

    const { error } = await supabase.auth.signInWithWeb3({
      chain: "ethereum",
      message,
      signature,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthError(null);
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signOut();

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setProfile(null);
    setConnectedWalletAddress(null);
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
          <Header authError={authError} />

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
