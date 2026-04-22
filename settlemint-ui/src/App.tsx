import { useEffect, useMemo, useState } from "react";
import "./App.css";

import type {
  Cycle,
  Tab,
  Member,
  Expense,
  Settlement,
  Badge,
  GroupFilterMode,
  GroupSortMode,
} from "./shared/types";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import CreateGroupModal from "./components/groups/CreateGroupModal";
import GroupActionModal from "./components/groups/GroupActionModal";
import JoinGroupModal from "./components/groups/JoinGroupModal";
import CreateSettlementCycleModal from "./components/cycles/CreateSettlementCycleModal";
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
import {
  createGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyGroups,
  joinGroup,
  leaveGroup,
} from "./api/groups";
import { createSettlementCycle, fetchGroupCycles } from "./api/cycles";
import { fetchMyProfile, updateMyProfile } from "./api/users";
import { clearAuthToken, getAuthToken, setAuthToken } from "./lib/auth";
import {
  getExistingConnectedEthereumWallet,
  getWalletChainId,
  requestWalletAccess,
  signMessage,
} from "./lib/wallet";
import type { UserProfile } from "./api/users";
import type { Group, GroupMember } from "./shared/types";

export default function App() {
  const initialRouteState = getRouteState();
  const [inviteFromUrl, setInviteFromUrl] = useState(initialRouteState.inviteCode);
  const [selectedTab, setSelectedTab] = useState<Tab>(initialRouteState.tab);
  const [requestedGroupID, setRequestedGroupID] = useState(initialRouteState.groupId);
  const [requestedCycleID, setRequestedCycleID] = useState(initialRouteState.cycleId);
  const [accessToken, setAccessToken] = useState<string | null>(() => getAuthToken());
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [createdGroupInvite, setCreatedGroupInvite] = useState<Group | null>(null);
  const [createGroupCopiedState, setCreateGroupCopiedState] = useState<"code" | "link" | null>(null);
  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
  const [joinInviteCodeDraft, setJoinInviteCodeDraft] = useState(inviteFromUrl);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinGroupError, setJoinGroupError] = useState<string | null>(null);
  const [groupActionSubmitting, setGroupActionSubmitting] = useState(false);
  const [pendingGroupAction, setPendingGroupAction] = useState<"leave" | "delete" | null>(null);
  const [groupActionError, setGroupActionError] = useState<string | null>(null);
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);
  const [cycleNameDraft, setCycleNameDraft] = useState("");
  const [cycleSubmitting, setCycleSubmitting] = useState(false);
  const [createCycleError, setCreateCycleError] = useState<string | null>(null);
  const [groupFilterMode, setGroupFilterMode] = useState<GroupFilterMode>("all");
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>("date");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

  const [members] = useState<Member[]>([]);
  const [expenses] = useState<Expense[]>([]);
  const [settlements] = useState<Settlement[]>([]);
  const [badges] = useState<Badge[]>([]);

  const archivedCycles = cycles.filter((cycle) => cycle.status === "Archived");
  const authenticatedWalletAddress = profile?.walletAddress || connectedWalletAddress;
  const walletAddress = authenticatedWalletAddress || connectedWalletAddress;
  const inviteBaseUrl = window.location.origin;
  const visibleGroups = useMemo(() => {
    let nextGroups = [...groups];

    if (groupFilterMode === "owned") {
      nextGroups = nextGroups.filter((group) => group.currentUserRole === "owner");
    }

    if (groupFilterMode === "member") {
      nextGroups = nextGroups.filter((group) => group.currentUserRole === "member");
    }

    if (groupSortMode === "name") {
      nextGroups.sort((leftGroup, rightGroup) => leftGroup.name.localeCompare(rightGroup.name));
      return nextGroups;
    }

    nextGroups.sort(
      (leftGroup, rightGroup) =>
        new Date(rightGroup.createdAt).getTime() - new Date(leftGroup.createdAt).getTime(),
    );
    return nextGroups;
  }, [groups, groupFilterMode, groupSortMode]);
  const canCreateSettlementCycle =
    Boolean(accessToken && selectedGroup && walletAddress) &&
    (selectedGroup?.currentUserRole === "owner" ||
      selectedGroup?.ownerWallet.toLowerCase() === walletAddress?.toLowerCase());

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
    function handlePopState() {
      const nextRouteState = getRouteState();
      setSelectedTab(nextRouteState.tab);
      setRequestedGroupID(nextRouteState.groupId);
      setRequestedCycleID(nextRouteState.cycleId);
      setInviteFromUrl(nextRouteState.inviteCode);
      setJoinInviteCodeDraft(nextRouteState.inviteCode);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setGroups([]);
      setSelectedGroup(null);
      setGroupMembers([]);
      setCycles([]);
      setSelectedCycle(null);
      return;
    }

    let mounted = true;

    Promise.all([fetchAuthenticatedUser(), fetchMyProfile(), fetchMyGroups()])
      .then(([, profileResult, groupsResult]) => {
        if (mounted) {
          setProfile(profileResult.profile);
          setConnectedWalletAddress(profileResult.profile.walletAddress || null);
          setGroups(groupsResult.groups);
          setSelectedGroup((currentSelectedGroup) => {
            const requestedGroup =
              groupsResult.groups.find((group) => group.id === requestedGroupID) ?? null;
            if (currentSelectedGroup) {
              return (
                groupsResult.groups.find((group) => group.id === currentSelectedGroup.id) ??
                requestedGroup ??
                groupsResult.groups[0] ??
                null
              );
            }
            return requestedGroup ?? groupsResult.groups[0] ?? null;
          });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setProfile(null);
          setGroups([]);
          setSelectedGroup(null);
          setWalletError(formatErrorMessage(error, "Failed to load account"));
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, requestedGroupID]);

  useEffect(() => {
    if (!accessToken || !selectedGroup) {
      setCycles([]);
      setSelectedCycle(null);
      return;
    }

    let mounted = true;

    fetchGroupCycles(selectedGroup.id)
      .then((result) => {
        if (mounted) {
          setCycles(result.cycles);
          setSelectedCycle((currentSelectedCycle) => {
            const requestedCycle =
              result.cycles.find((cycle) => cycle.id === requestedCycleID) ?? null;
            if (currentSelectedCycle) {
              return (
                result.cycles.find((cycle) => cycle.id === currentSelectedCycle.id) ??
                requestedCycle ??
                result.cycles[0] ??
                null
              );
            }
            return requestedCycle ?? result.cycles[0] ?? null;
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setCycles([]);
          setSelectedCycle(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, selectedGroup?.id, requestedCycleID]);

  useEffect(() => {
    if (!accessToken || !selectedGroup) {
      setGroupMembers([]);
      return;
    }

    let mounted = true;

    fetchGroupMembers(selectedGroup.id)
      .then((result) => {
        if (mounted) {
          setGroupMembers(result.members);
        }
      })
      .catch(() => {
        if (mounted) {
          setGroupMembers([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, selectedGroup?.id]);

  useEffect(() => {
    if (!inviteFromUrl || !accessToken) {
      return;
    }

    setJoinInviteCodeDraft(inviteFromUrl);
    setIsJoinGroupModalOpen(true);
  }, [accessToken, inviteFromUrl]);

  useEffect(() => {
    if (visibleGroups.length === 0) {
      setSelectedGroup(null);
      return;
    }

    if (!selectedGroup || !visibleGroups.some((group) => group.id === selectedGroup.id)) {
      const requestedGroup =
        visibleGroups.find((group) => group.id === requestedGroupID) ?? visibleGroups[0];
      setSelectedGroup(requestedGroup);
    }
  }, [visibleGroups, selectedGroup, requestedGroupID]);

  useEffect(() => {
    syncBrowserRoute({
      tab: selectedTab,
      groupId: selectedGroup?.id ?? "",
      cycleId: selectedCycle?.id ?? "",
      inviteCode: inviteFromUrl,
    });
  }, [selectedTab, selectedGroup?.id, selectedCycle?.id, inviteFromUrl]);

  async function handleWalletSignIn() {
    if (accessToken && authenticatedWalletAddress) {
      return;
    }

    setAuthLoading(true);
    setWalletError(null);

    try {
      const wallet =
        (await getExistingConnectedEthereumWallet()) ||
        (await requestWalletAccess());

      if (!wallet) {
        setWalletError("MetaMask or another Ethereum wallet was not detected in this browser.");
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
      setWalletError(null);
    } catch (error) {
      setWalletError(formatErrorMessage(error, "Failed to sign in with wallet"));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setWalletError(null);
    clearAuthToken();
    setAccessToken(null);
    setProfile(null);
    setGroups([]);
      setSelectedGroup(null);
    setGroupMembers([]);
    setConnectedWalletAddress(null);
    setAuthLoading(false);
  }

  async function handleSaveProfile(input: {
    displayName: string;
  }) {
    setProfileSaving(true);
    setWalletError(null);

    try {
      const result = await updateMyProfile(input);
      setProfile(result.profile);
    } catch (error) {
      setWalletError(formatErrorMessage(error, "Failed to save profile"));
    } finally {
      setProfileSaving(false);
    }
  }

  function handleCreateGroup() {
    setWalletError(null);
    setGroupNameDraft("");
    setCreateGroupError(null);
    setCreatedGroupInvite(null);
    setCreateGroupCopiedState(null);
    setIsCreateGroupModalOpen(true);
  }

  function handleCloseCreateGroupModal() {
    if (groupSubmitting) {
      return;
    }

    setIsCreateGroupModalOpen(false);
    setGroupNameDraft("");
    setCreateGroupError(null);
    setCreatedGroupInvite(null);
    setCreateGroupCopiedState(null);
  }

  async function handleSubmitCreateGroup() {
    const name = groupNameDraft.trim();
    if (!name) {
      setCreateGroupError("Group name is required.");
      return;
    }

    setGroupSubmitting(true);
    setCreateGroupError(null);

    try {
      const result = await createGroup({ name });
      upsertGroup(result.group);
      setGroupNameDraft("");
      setCreatedGroupInvite(result.group);
    } catch (error) {
      setCreateGroupError(formatErrorMessage(error, "Failed to create group"));
    } finally {
      setGroupSubmitting(false);
    }
  }

  function handleResetCreateGroupModal() {
    if (groupSubmitting) {
      return;
    }

    setGroupNameDraft("");
    setCreateGroupError(null);
    setCreatedGroupInvite(null);
    setCreateGroupCopiedState(null);
  }

  function handleCreateGroupNameChange(value: string) {
    setGroupNameDraft(value);
    if (createGroupError) {
      setCreateGroupError(null);
    }
  }

  async function handleCopyCreatedInviteCode() {
    if (!createdGroupInvite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdGroupInvite.inviteCode);
      setCreateGroupCopiedState("code");
      window.setTimeout(() => {
        setCreateGroupCopiedState((current) => (current === "code" ? null : current));
      }, 1800);
    } catch {
      setCreateGroupCopiedState(null);
    }
  }

  async function handleCopyCreatedInviteLink() {
    if (!createdGroupInvite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${inviteBaseUrl}?invite=${createdGroupInvite.inviteCode}`);
      setCreateGroupCopiedState("link");
      window.setTimeout(() => {
        setCreateGroupCopiedState((current) => (current === "link" ? null : current));
      }, 1800);
    } catch {
      setCreateGroupCopiedState(null);
    }
  }

  function upsertGroup(nextGroup: Group) {
    setGroups((currentGroups) => {
      const existingIndex = currentGroups.findIndex((group) => group.id === nextGroup.id);
      if (existingIndex === -1) {
        return [nextGroup, ...currentGroups];
      }

      const updatedGroups = [...currentGroups];
      updatedGroups[existingIndex] = nextGroup;
      return updatedGroups;
    });
    setSelectedGroup(nextGroup);
    setRequestedGroupID(nextGroup.id);
  }

  function removeGroup(groupID: string) {
    setGroups((currentGroups) => {
      const nextGroups = currentGroups.filter((group) => group.id !== groupID);
      setSelectedGroup((currentSelectedGroup) => {
        if (!currentSelectedGroup || currentSelectedGroup.id !== groupID) {
          return currentSelectedGroup;
        }
        return nextGroups[0] ?? null;
      });
      return nextGroups;
    });
    setRequestedGroupID("");
  }

  function handleOpenJoinGroupModal() {
    setJoinGroupError(null);
    setIsJoinGroupModalOpen(true);
  }

  function handleCloseJoinGroupModal() {
    if (joinSubmitting) {
      return;
    }

    setIsJoinGroupModalOpen(false);
    setJoinGroupError(null);
    if (!inviteFromUrl) {
      setJoinInviteCodeDraft("");
    }
  }

  async function handleSubmitJoinGroup() {
    const inviteCode = extractInviteCode(joinInviteCodeDraft);
    if (!inviteCode) {
      setJoinGroupError("Invite code is required.");
      return;
    }

    setJoinSubmitting(true);
    setJoinGroupError(null);

    try {
      const result = await joinGroup({ inviteCode });
      upsertGroup(result.group);
      setIsJoinGroupModalOpen(false);
      setJoinInviteCodeDraft("");
      setInviteFromUrl("");

      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      setJoinGroupError(formatErrorMessage(error, "Failed to join group"));
    } finally {
      setJoinSubmitting(false);
    }
  }

  async function handleLeaveSelectedGroup() {
    if (!selectedGroup) {
      return;
    }

    setGroupActionSubmitting(true);
    setGroupActionError(null);

    try {
      await leaveGroup(selectedGroup.id);
      removeGroup(selectedGroup.id);
      setPendingGroupAction(null);
    } catch (error) {
      setGroupActionError(formatErrorMessage(error, "Failed to leave group"));
    } finally {
      setGroupActionSubmitting(false);
    }
  }

  async function handleDeleteSelectedGroup() {
    if (!selectedGroup) {
      return;
    }

    setGroupActionSubmitting(true);
    setGroupActionError(null);

    try {
      await deleteGroup(selectedGroup.id);
      removeGroup(selectedGroup.id);
      setPendingGroupAction(null);
    } catch (error) {
      setGroupActionError(formatErrorMessage(error, "Failed to delete group"));
    } finally {
      setGroupActionSubmitting(false);
    }
  }

  function upsertCycle(nextCycle: Cycle) {
    setCycles((currentCycles) => {
      const existingIndex = currentCycles.findIndex((cycle) => cycle.id === nextCycle.id);
      if (existingIndex === -1) {
        return [nextCycle, ...currentCycles];
      }

      const updatedCycles = [...currentCycles];
      updatedCycles[existingIndex] = nextCycle;
      return updatedCycles;
    });
    setSelectedCycle(nextCycle);
    setRequestedCycleID(nextCycle.id);
  }

  function handleCreateSettlementPeriod() {
    setCreateCycleError(null);
    setCycleNameDraft("");
    setIsCreateCycleModalOpen(true);
  }

  function handleCloseCreateCycleModal() {
    if (cycleSubmitting) {
      return;
    }

    setIsCreateCycleModalOpen(false);
    setCycleNameDraft("");
    setCreateCycleError(null);
  }

  async function handleSubmitCreateCycle() {
    if (!selectedGroup) {
      setCreateCycleError("A group must be selected.");
      return;
    }

    const name = cycleNameDraft.trim();
    if (!name) {
      setCreateCycleError("Settlement Cycle name is required.");
      return;
    }

    setCycleSubmitting(true);
    setCreateCycleError(null);

    try {
      const result = await createSettlementCycle(selectedGroup.id, { name });
      upsertCycle(result.cycle);
      setIsCreateCycleModalOpen(false);
      setCycleNameDraft("");
    } catch (error) {
      setCreateCycleError(formatErrorMessage(error, "Failed to create Settlement Cycle"));
    } finally {
      setCycleSubmitting(false);
    }
  }

  function handleCloseGroupActionModal() {
    if (groupActionSubmitting) {
      return;
    }

    setPendingGroupAction(null);
    setGroupActionError(null);
  }

  function handleConfirmGroupAction() {
    if (pendingGroupAction === "leave") {
      void handleLeaveSelectedGroup();
      return;
    }

    if (pendingGroupAction === "delete") {
      void handleDeleteSelectedGroup();
    }
  }

  return (
    <div className="app-page">
      <div className="app-glow app-glow-one" />
      <div className="app-glow app-glow-two" />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        groupName={groupNameDraft}
        submitting={groupSubmitting}
        createdGroup={createdGroupInvite}
        copiedState={createGroupCopiedState}
        errorMessage={createGroupError}
        onGroupNameChange={handleCreateGroupNameChange}
        onClose={handleCloseCreateGroupModal}
        onSubmit={() => void handleSubmitCreateGroup()}
        onReset={handleResetCreateGroupModal}
        onCopyInviteCode={() => void handleCopyCreatedInviteCode()}
        onCopyInviteLink={() => void handleCopyCreatedInviteLink()}
      />
      <JoinGroupModal
        isOpen={isJoinGroupModalOpen}
        inviteCode={joinInviteCodeDraft}
        submitting={joinSubmitting}
        errorMessage={joinGroupError}
        onInviteCodeChange={setJoinInviteCodeDraft}
        onClose={handleCloseJoinGroupModal}
        onSubmit={() => void handleSubmitJoinGroup()}
      />
      <GroupActionModal
        isOpen={pendingGroupAction !== null}
        title={
          pendingGroupAction === "delete"
            ? `Delete ${selectedGroup ? `"${selectedGroup.name}"` : "group"}?`
            : `Leave ${selectedGroup ? `"${selectedGroup.name}"` : "group"}?`
        }
        description={
          pendingGroupAction === "delete"
            ? "This is only allowed when no other members remain in the group."
            : "You will lose access to this group until someone invites you again."
        }
        confirmLabel={pendingGroupAction === "delete" ? "Delete Group" : "Leave Group"}
        submittingLabel={pendingGroupAction === "delete" ? "Deleting..." : "Leaving..."}
        submitting={groupActionSubmitting}
        errorMessage={groupActionError}
        tone={pendingGroupAction === "delete" ? "danger" : "default"}
        onClose={handleCloseGroupActionModal}
        onConfirm={handleConfirmGroupAction}
      />
      <CreateSettlementCycleModal
        isOpen={isCreateCycleModalOpen}
        groupName={selectedGroup?.name ?? null}
        cycleName={cycleNameDraft}
        submitting={cycleSubmitting}
        errorMessage={createCycleError}
        onCycleNameChange={(value) => {
          setCycleNameDraft(value);
          if (createCycleError) {
            setCreateCycleError(null);
          }
        }}
        onClose={handleCloseCreateCycleModal}
        onSubmit={() => void handleSubmitCreateCycle()}
      />

      <div className="app-shell">
        <Sidebar
          walletConnected={Boolean(connectedWalletAddress)}
          walletAddress={walletAddress}
          walletLoading={authLoading}
          walletError={walletError}
          profile={profile}
          profileSaving={profileSaving}
          onWalletAction={handleWalletSignIn}
          onDisconnect={handleSignOut}
          onSaveProfile={handleSaveProfile}
          selectedTab={selectedTab}
          setSelectedTab={(tab) => setSelectedTab(tab)}
          groups={visibleGroups}
          selectedGroup={selectedGroup}
          setSelectedGroup={(group) => {
            setSelectedGroup(group);
            setRequestedGroupID(group.id);
          }}
          groupFilterMode={groupFilterMode}
          groupSortMode={groupSortMode}
          onGroupFilterModeChange={setGroupFilterMode}
          onGroupSortModeChange={setGroupSortMode}
          cycles={cycles}
          selectedCycle={selectedCycle}
          setSelectedCycle={(cycle) => {
            setSelectedCycle(cycle);
            setRequestedCycleID(cycle.id);
          }}
        />

        <main className="app-main">
          <Header
            actionsDisabled={!accessToken}
            showSettlementCycleAction={canCreateSettlementCycle}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleOpenJoinGroupModal}
            onCreateSettlementPeriod={handleCreateSettlementPeriod}
          />

          <HeroSection
            currentGroup={selectedGroup}
            currentWalletAddress={walletAddress}
            groupMembers={groupMembers}
            expenseTotal={totals.expenseTotal}
            pendingCount={totals.pendingCount}
            verifiedCount={totals.verifiedCount}
            actionLoading={groupActionSubmitting}
            onLeaveGroup={() => setPendingGroupAction("leave")}
            onDeleteGroup={() => setPendingGroupAction("delete")}
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

function extractInviteCode(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.searchParams.get("invite")?.trim() || trimmedValue;
  } catch {
    return trimmedValue;
  }
}

function formatErrorMessage(error: unknown, fallbackMessage: string) {
  const message =
    error instanceof Error && error.message.trim() !== ""
      ? error.message.trim()
      : fallbackMessage;

  return message.charAt(0).toUpperCase() + message.slice(1);
}

function getRouteState() {
  const url = new URL(window.location.href);
  const pathname = url.pathname.toLowerCase();

  return {
    tab: tabFromPathname(pathname),
    groupId: url.searchParams.get("group")?.trim() || "",
    cycleId: url.searchParams.get("cycle")?.trim() || "",
    inviteCode: url.searchParams.get("invite")?.trim() || "",
  };
}

function syncBrowserRoute(input: {
  tab: Tab;
  groupId: string;
  cycleId: string;
  inviteCode: string;
}) {
  const nextUrl = new URL(window.location.href);
  nextUrl.pathname = pathnameForTab(input.tab);

  if (input.groupId) {
    nextUrl.searchParams.set("group", input.groupId);
  } else {
    nextUrl.searchParams.delete("group");
  }

  if (input.cycleId) {
    nextUrl.searchParams.set("cycle", input.cycleId);
  } else {
    nextUrl.searchParams.delete("cycle");
  }

  if (input.inviteCode) {
    nextUrl.searchParams.set("invite", input.inviteCode);
  } else {
    nextUrl.searchParams.delete("invite");
  }

  const nextRelativeUrl = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextRelativeUrl !== currentRelativeUrl) {
    window.history.replaceState({}, "", nextRelativeUrl);
  }
}

function tabFromPathname(pathname: string): Tab {
  switch (pathname) {
    case "/expenses":
      return "Expenses";
    case "/settlement-plan":
      return "Settlement Plan";
    case "/archive":
      return "Archive";
    case "/dashboard":
    case "/":
    default:
      return "Overview";
  }
}

function pathnameForTab(tab: Tab) {
  switch (tab) {
    case "Expenses":
      return "/expenses";
    case "Settlement Plan":
      return "/settlement-plan";
    case "Archive":
      return "/archive";
    case "Overview":
    default:
      return "/dashboard";
  }
}
