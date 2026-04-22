import { useState } from "react";
import "./App.css";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import CreateGroupModal from "./components/groups/CreateGroupModal";
import GroupActionModal from "./components/groups/GroupActionModal";
import JoinGroupModal from "./components/groups/JoinGroupModal";
import CreateSettlementCycleModal from "./components/cycles/CreateSettlementCycleModal";
import HeroSection from "./components/main/HeroSection";
import OverviewTab from "./components/main/OverviewTab";
import CreateExpenseModal from "./components/expenses/CreateExpenseModal";
import ExpensesTab from "./components/expenses/ExpensesTab";
import SettlementPlanTab from "./components/settlement/SettlementPlanTab";
import ArchiveTab from "./components/archive/ArchiveTab";
import { useAppRoute } from "./lib/appRoute";
import { useWalletSession } from "./hooks/useWalletSession";
import { useGroupWorkspace } from "./hooks/useGroupWorkspace";
import { useCycleFinance } from "./hooks/useCycleFinance";

export default function App() {
  const {
    inviteFromUrl,
    setInviteFromUrl,
    selectedTab,
    setSelectedTab,
    requestedGroupID,
    setRequestedGroupID,
    requestedCycleID,
    setRequestedCycleID,
  } = useAppRoute();

  const {
    accessToken,
    connectedWalletAddress,
    profile,
    profileSaving,
    authLoading,
    walletError,
    walletAddress,
    handleWalletSignIn,
    handleSignOut: signOutWalletSession,
    handleSaveProfile,
  } = useWalletSession();

  const inviteBaseUrl = window.location.origin;

  const groupWorkspace = useGroupWorkspace({
    accessToken,
    walletAddress,
    requestedGroupID,
    setRequestedGroupID,
    requestedCycleID,
    setRequestedCycleID,
    inviteFromUrl,
    setInviteFromUrl,
    inviteBaseUrl,
  });

  const cycleFinance = useCycleFinance({
    accessToken,
    selectedGroup: groupWorkspace.selectedGroup,
    selectedCycle: groupWorkspace.selectedCycle,
    groupMembers: groupWorkspace.groupMembers,
    walletAddress,
  });

  const [badges] = useState([]);

  async function handleSignOut() {
    await signOutWalletSession();
    groupWorkspace.resetGroupUIState();
    cycleFinance.resetFinanceUIState();
  }

  return (
    <div className="app-page">
      <div className="app-glow app-glow-one" />
      <div className="app-glow app-glow-two" />

      <CreateGroupModal
        isOpen={groupWorkspace.isCreateGroupModalOpen}
        groupName={groupWorkspace.groupNameDraft}
        submitting={groupWorkspace.groupSubmitting}
        createdGroup={groupWorkspace.createdGroupInvite}
        copiedState={groupWorkspace.createGroupCopiedState}
        errorMessage={groupWorkspace.createGroupError}
        onGroupNameChange={groupWorkspace.handleCreateGroupNameChange}
        onClose={groupWorkspace.handleCloseCreateGroupModal}
        onSubmit={() => void groupWorkspace.handleSubmitCreateGroup()}
        onReset={groupWorkspace.handleResetCreateGroupModal}
        onCopyInviteCode={() => void groupWorkspace.handleCopyCreatedInviteCode()}
        onCopyInviteLink={() => void groupWorkspace.handleCopyCreatedInviteLink()}
      />

      <JoinGroupModal
        isOpen={groupWorkspace.isJoinGroupModalOpen}
        inviteCode={groupWorkspace.joinInviteCodeDraft}
        submitting={groupWorkspace.joinSubmitting}
        errorMessage={groupWorkspace.joinGroupError}
        onInviteCodeChange={groupWorkspace.setJoinInviteCodeDraft}
        onClose={groupWorkspace.handleCloseJoinGroupModal}
        onSubmit={() => void groupWorkspace.handleSubmitJoinGroup()}
      />

      <GroupActionModal
        isOpen={groupWorkspace.pendingGroupAction !== null}
        title={
          groupWorkspace.pendingGroupAction === "delete"
            ? `Delete ${groupWorkspace.selectedGroup ? `"${groupWorkspace.selectedGroup.name}"` : "group"}?`
            : `Leave ${groupWorkspace.selectedGroup ? `"${groupWorkspace.selectedGroup.name}"` : "group"}?`
        }
        description={
          groupWorkspace.pendingGroupAction === "delete"
            ? "This is only allowed when no other members remain in the group."
            : "You will lose access to this group until someone invites you again."
        }
        confirmLabel={groupWorkspace.pendingGroupAction === "delete" ? "Delete Group" : "Leave Group"}
        submittingLabel={groupWorkspace.pendingGroupAction === "delete" ? "Deleting..." : "Leaving..."}
        submitting={groupWorkspace.groupActionSubmitting}
        errorMessage={groupWorkspace.groupActionError}
        tone={groupWorkspace.pendingGroupAction === "delete" ? "danger" : "default"}
        onClose={groupWorkspace.handleCloseGroupActionModal}
        onConfirm={groupWorkspace.handleConfirmGroupAction}
      />

      <CreateSettlementCycleModal
        isOpen={groupWorkspace.isCreateCycleModalOpen}
        groupName={groupWorkspace.selectedGroup?.name ?? null}
        cycleName={groupWorkspace.cycleNameDraft}
        submitting={groupWorkspace.cycleSubmitting}
        errorMessage={groupWorkspace.createCycleError}
        onCycleNameChange={groupWorkspace.handleCycleNameChange}
        onClose={groupWorkspace.handleCloseCreateCycleModal}
        onSubmit={() => void groupWorkspace.handleSubmitCreateCycle()}
      />
      
      <CreateExpenseModal
        isOpen={cycleFinance.isCreateExpenseModalOpen}
        groupName={groupWorkspace.selectedGroup?.name ?? null}
        cycleName={groupWorkspace.selectedCycle?.name ?? null}
        members={groupWorkspace.groupMembers}
        defaultPaidByWallet={cycleFinance.defaultPaidByWallet}
        submitting={cycleFinance.expenseSubmitting}
        errorMessage={cycleFinance.createExpenseError}
        onClose={cycleFinance.handleCloseCreateExpenseModal}
        onSubmit={cycleFinance.handleSubmitCreateExpense}
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
          groups={groupWorkspace.visibleGroups}
          selectedGroup={groupWorkspace.selectedGroup}
          setSelectedGroup={groupWorkspace.setSelectedGroup}
          groupFilterMode={groupWorkspace.groupFilterMode}
          groupSortMode={groupWorkspace.groupSortMode}
          onGroupFilterModeChange={groupWorkspace.setGroupFilterMode}
          onGroupSortModeChange={groupWorkspace.setGroupSortMode}
          cycles={groupWorkspace.cycles}
          selectedCycle={groupWorkspace.selectedCycle}
          setSelectedCycle={groupWorkspace.setSelectedCycle}
        />

        <main className="app-main">
          <Header
            actionsDisabled={!accessToken}
            showSettlementCycleAction={groupWorkspace.canCreateSettlementCycle}
            onCreateGroup={groupWorkspace.handleCreateGroup}
            onJoinGroup={groupWorkspace.handleOpenJoinGroupModal}
            onCreateSettlementPeriod={groupWorkspace.handleCreateSettlementPeriod}
          />

          <HeroSection
            currentGroup={groupWorkspace.selectedGroup}
            currentWalletAddress={walletAddress}
            groupMembers={groupWorkspace.groupMembers}
            expenseTotal={cycleFinance.totals.expenseTotal}
            pendingCount={cycleFinance.totals.pendingCount}
            verifiedCount={cycleFinance.totals.verifiedCount}
            actionLoading={groupWorkspace.groupActionSubmitting}
            onLeaveGroup={() => groupWorkspace.setPendingGroupAction("leave")}
            onDeleteGroup={() => groupWorkspace.setPendingGroupAction("delete")}
          />

          {selectedTab === "Overview" && (
            <OverviewTab
              members={cycleFinance.members}
              expenses={cycleFinance.expenses}
              badges={badges}
              hasSelectedCycle={cycleFinance.hasSelectedCycle}
              loading={cycleFinance.financeLoading}
              errorMessage={cycleFinance.financeError}
              canAddExpense={cycleFinance.canAddExpense}
              onRefreshBalances={() => void cycleFinance.handleRefreshCycleFinance()}
              onAddExpense={cycleFinance.handleOpenCreateExpenseModal}
            />
          )}

          {selectedTab === "Expenses" && (
            <ExpensesTab
              expenses={cycleFinance.expenses}
              selectedCycleName={cycleFinance.hasSelectedCycle ? groupWorkspace.selectedCycle?.name ?? null : null}
              loading={cycleFinance.financeLoading}
              errorMessage={cycleFinance.financeError}
              canAddExpense={cycleFinance.canAddExpense}
              deletingExpenseIDs={cycleFinance.expenseDeletePendingIDs}
              onAddExpense={cycleFinance.handleOpenCreateExpenseModal}
              onApproveDelete={(expenseID) => void cycleFinance.handleApproveExpenseDelete(expenseID)}
            />
          )}

          {selectedTab === "Settlement Plan" && (
            <SettlementPlanTab
              members={cycleFinance.members}
              settlements={cycleFinance.settlements}
              selectedCycleName={cycleFinance.hasSelectedCycle ? groupWorkspace.selectedCycle?.name ?? null : null}
              loading={cycleFinance.financeLoading}
              errorMessage={cycleFinance.financeError}
            />
          )}

          {selectedTab === "Archive" && (
            <ArchiveTab archivedCycles={groupWorkspace.archivedCycles} />
          )}
        </main>
      </div>
    </div>
  );
}
