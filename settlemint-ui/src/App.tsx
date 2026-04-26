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
import { useAccountSession } from "./hooks/useAccountSession";
import { useGroupDirectory } from "./hooks/useGroupDirectory";
import { useSettlementLedger } from "./hooks/useSettlementLedger";
import { useSettlementPayments } from "./hooks/useSettlementPayments";

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
    signIn,
    signOut,
    saveProfile,
  } = useAccountSession();

  const inviteBaseUrl = window.location.origin;

  const groupDirectory = useGroupDirectory({
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

  const settlementLedger = useSettlementLedger({
    accessToken,
    selectedGroup: groupDirectory.groups.current,
    selectedCycle: groupDirectory.cycles.current,
    groupMembers: groupDirectory.groups.members,
    walletAddress,
  });
  const settlementPayments = useSettlementPayments({
    walletAddress,
    selectedCycle: groupDirectory.cycles.current,
    settlements: settlementLedger.summary.settlements,
    payments: settlementLedger.summary.payments,
    onPaymentStateChanged: settlementLedger.refresh,
  });
  const showSettlementCycleAction = groupDirectory.cycles.canCreate;

  async function handleCloseCycle() {
    const archive = await groupDirectory.cycles.close();
    if (archive) {
      setSelectedTab("Archive");
    }
  }

  async function handleSignOut() {
    await signOut();
    groupDirectory.resetUiState();
    settlementLedger.resetUiState();
    settlementPayments.resetUiState();
  }

  return (
    <div className="app-page">
      <div className="app-glow app-glow-one" />
      <div className="app-glow app-glow-two" />

      <CreateGroupModal
        isOpen={groupDirectory.dialogs.createGroup.isOpen}
        groupName={groupDirectory.dialogs.createGroup.name}
        submitting={groupDirectory.dialogs.createGroup.submitting}
        createdGroup={groupDirectory.dialogs.createGroup.createdGroup}
        copiedState={groupDirectory.dialogs.createGroup.copiedState}
        errorMessage={groupDirectory.dialogs.createGroup.errorMessage}
        onGroupNameChange={groupDirectory.dialogs.createGroup.updateName}
        onClose={groupDirectory.dialogs.createGroup.close}
        onSubmit={() => void groupDirectory.dialogs.createGroup.submit()}
        onReset={groupDirectory.dialogs.createGroup.reset}
        onCopyInviteCode={() => void groupDirectory.dialogs.createGroup.copyInviteCode()}
        onCopyInviteLink={() => void groupDirectory.dialogs.createGroup.copyInviteLink()}
      />

      <JoinGroupModal
        isOpen={groupDirectory.dialogs.joinGroup.isOpen}
        inviteCode={groupDirectory.dialogs.joinGroup.inviteCode}
        submitting={groupDirectory.dialogs.joinGroup.submitting}
        errorMessage={groupDirectory.dialogs.joinGroup.errorMessage}
        onInviteCodeChange={groupDirectory.dialogs.joinGroup.updateInviteCode}
        onClose={groupDirectory.dialogs.joinGroup.close}
        onSubmit={() => void groupDirectory.dialogs.joinGroup.submit()}
      />

      <GroupActionModal
        isOpen={groupDirectory.dialogs.groupAction.isOpen}
        title={groupDirectory.dialogs.groupAction.title}
        description={groupDirectory.dialogs.groupAction.description}
        confirmLabel={groupDirectory.dialogs.groupAction.confirmLabel}
        submittingLabel={groupDirectory.dialogs.groupAction.submittingLabel}
        submitting={groupDirectory.dialogs.groupAction.submitting}
        errorMessage={groupDirectory.dialogs.groupAction.errorMessage}
        tone={groupDirectory.dialogs.groupAction.tone}
        onClose={groupDirectory.dialogs.groupAction.close}
        onConfirm={groupDirectory.dialogs.groupAction.confirm}
      />

      <CreateSettlementCycleModal
        isOpen={groupDirectory.dialogs.createCycle.isOpen}
        groupName={groupDirectory.groups.current?.name ?? null}
        cycleName={groupDirectory.dialogs.createCycle.name}
        submitting={groupDirectory.dialogs.createCycle.submitting}
        errorMessage={groupDirectory.dialogs.createCycle.errorMessage}
        onCycleNameChange={groupDirectory.dialogs.createCycle.updateName}
        onClose={groupDirectory.dialogs.createCycle.close}
        onSubmit={() => void groupDirectory.dialogs.createCycle.submit()}
      />
      
      <CreateExpenseModal
        isOpen={settlementLedger.expenseDialog.isOpen}
        groupName={groupDirectory.groups.current?.name ?? null}
        cycleName={groupDirectory.cycles.current?.name ?? null}
        members={groupDirectory.groups.members}
        defaultPaidByWallet={settlementLedger.expenseDialog.defaultPaidByWallet}
        submitting={settlementLedger.expenseDialog.submitting}
        errorMessage={settlementLedger.expenseDialog.errorMessage}
        onClose={settlementLedger.expenseDialog.close}
        onSubmit={settlementLedger.expenseDialog.submit}
      />

      <div className="app-shell">
        <Sidebar
          walletConnected={Boolean(connectedWalletAddress)}
          walletAddress={walletAddress}
          walletLoading={authLoading}
          walletError={walletError}
          profile={profile}
          profileSaving={profileSaving}
          onWalletAction={signIn}
          onDisconnect={handleSignOut}
          onSaveProfile={saveProfile}
          selectedTab={selectedTab}
          setSelectedTab={(tab) => setSelectedTab(tab)}
          groups={groupDirectory.groups.list}
          selectedGroup={groupDirectory.groups.current}
          setSelectedGroup={groupDirectory.groups.select}
          groupFilterMode={groupDirectory.filters.mode}
          groupSortMode={groupDirectory.filters.sortMode}
          onGroupFilterModeChange={groupDirectory.filters.setMode}
          onGroupSortModeChange={groupDirectory.filters.setSortMode}
          cycles={groupDirectory.cycles.list}
          selectedCycle={groupDirectory.cycles.current}
          setSelectedCycle={groupDirectory.cycles.select}
        />

        <main className="app-main">
          <Header
            actionsDisabled={!accessToken}
            showSettlementCycleAction={showSettlementCycleAction}
            onCreateGroup={groupDirectory.dialogs.createGroup.open}
            onJoinGroup={groupDirectory.dialogs.joinGroup.open}
            onCreateSettlementPeriod={groupDirectory.dialogs.createCycle.open}
          />

          <HeroSection
            currentGroup={groupDirectory.groups.current}
            currentWalletAddress={walletAddress}
            groupMembers={groupDirectory.groups.members}
            hasSelectedCycle={settlementLedger.cycle.hasSelected}
            expenseTotal={settlementLedger.summary.totals.expenseTotal}
            pendingCount={settlementLedger.summary.totals.pendingCount}
            verifiedCount={settlementLedger.summary.totals.verifiedCount}
            actionLoading={groupDirectory.dialogs.groupAction.submitting}
            onLeaveGroup={() => groupDirectory.dialogs.groupAction.request("leave")}
            onDeleteGroup={() => groupDirectory.dialogs.groupAction.request("delete")}
          />

          {selectedTab === "Overview" && (
            <OverviewTab
              members={settlementLedger.summary.members}
              expenses={settlementLedger.summary.expenses}
              hasSelectedCycle={settlementLedger.cycle.hasSelected}
              loading={settlementLedger.summary.loading}
              errorMessage={settlementLedger.summary.errorMessage}
              canAddExpense={settlementLedger.cycle.canAddExpense}
              onRefreshBalances={() => void settlementLedger.refresh()}
              onAddExpense={settlementLedger.expenseDialog.open}
            />
          )}

          {selectedTab === "Expenses" && (
            <ExpensesTab
              expenses={settlementLedger.summary.expenses}
              selectedCycleName={
                settlementLedger.cycle.hasSelected ? groupDirectory.cycles.current?.name ?? null : null
              }
              loading={settlementLedger.summary.loading}
              errorMessage={settlementLedger.summary.errorMessage}
              canAddExpense={settlementLedger.cycle.canAddExpense}
              deletingExpenseIDs={settlementLedger.expenseDeletion.pendingIDs}
              onAddExpense={settlementLedger.expenseDialog.open}
              onApproveDelete={(expenseID) => void settlementLedger.expenseDeletion.approve(expenseID)}
            />
          )}

          {selectedTab === "Settlement Plan" && (
            <SettlementPlanTab
              members={settlementLedger.summary.members}
              repaymentBlocks={settlementPayments.repaymentBlocks}
              selectedCycleName={
                settlementLedger.cycle.hasSelected ? groupDirectory.cycles.current?.name ?? null : null
              }
              loading={settlementLedger.summary.loading}
              errorMessage={settlementLedger.summary.errorMessage}
              cycleActionErrorMessage={groupDirectory.cycles.actionErrorMessage}
              currentWalletAddress={walletAddress}
              paymentPendingIDs={settlementPayments.pendingRepaymentBlockIDs}
              paymentErrorMessage={settlementPayments.errorMessage}
              paymentConfigured={settlementPayments.paymentConfigured}
              paymentSetupMessage={settlementPayments.paymentSetupMessage}
              paymentRailLabel={settlementPayments.paymentRailLabel}
              paymentAssetSymbol={settlementPayments.paymentAssetSymbol}
              showCloseCycleButton={groupDirectory.cycles.canClose}
              canCloseCycle={
                groupDirectory.cycles.canClose &&
                !settlementLedger.summary.loading &&
                settlementLedger.summary.settlements.every(
                  (settlement) => settlement.status === "Verified",
                ) &&
                settlementLedger.summary.payments.every(
                  (payment) => payment.status === "Verified" || payment.status === "Rejected",
                )
              }
              closingCycle={groupDirectory.cycles.closing}
              onCloseCycle={() => void handleCloseCycle()}
              onPaySettlement={(repaymentBlock) => void settlementPayments.paySettlement(repaymentBlock)}
            />
          )}

          {selectedTab === "Archive" && (
            <ArchiveTab
              groupID={groupDirectory.groups.current?.id ?? ""}
              archivedCycles={groupDirectory.cycles.archived}
            />
          )}
        </main>
      </div>
    </div>
  );
}
