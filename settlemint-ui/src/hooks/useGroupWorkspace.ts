import { useEffect, useMemo, useState } from "react";
import { createSettlementCycle, fetchGroupCycles } from "../api/cycles";
import {
  createGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyGroups,
  joinGroup,
  leaveGroup,
} from "../api/groups";
import { extractInviteCode, formatErrorMessage } from "../lib/appHelpers";
import type {
  Cycle,
  Group,
  GroupFilterMode,
  GroupMember,
  GroupSortMode,
} from "../shared/types";

type UseGroupWorkspaceInput = {
  accessToken: string | null;
  walletAddress: string | null;
  requestedGroupID: string;
  setRequestedGroupID: (value: string) => void;
  requestedCycleID: string;
  setRequestedCycleID: (value: string) => void;
  inviteFromUrl: string;
  setInviteFromUrl: (value: string) => void;
  inviteBaseUrl: string;
};

export function useGroupWorkspace({
  accessToken,
  walletAddress,
  requestedGroupID,
  setRequestedGroupID,
  requestedCycleID,
  setRequestedCycleID,
  inviteFromUrl,
  setInviteFromUrl,
  inviteBaseUrl,
}: UseGroupWorkspaceInput) {
  const [groupFilterMode, setGroupFilterMode] = useState<GroupFilterMode>("all");
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>("date");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

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

  const archivedCycles = cycles.filter((cycle) => cycle.status === "Archived");
  const canCreateSettlementCycle =
    Boolean(accessToken && selectedGroup && walletAddress) &&
    (selectedGroup?.currentUserRole === "owner" ||
      selectedGroup?.ownerWallet.toLowerCase() === walletAddress?.toLowerCase());

  useEffect(() => {
    if (!accessToken) {
      setGroups([]);
      setSelectedGroup(null);
      setGroupMembers([]);
      setCycles([]);
      setSelectedCycle(null);
      return;
    }

    let mounted = true;

    fetchMyGroups()
      .then((groupsResult) => {
        if (mounted) {
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
      .catch(() => {
        if (mounted) {
          setGroups([]);
          setSelectedGroup(null);
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

  function handleCreateGroup() {
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

  function handleCreateSettlementPeriod() {
    setCreateCycleError(null);
    setCycleNameDraft("");
    setIsCreateCycleModalOpen(true);
  }

  function handleCycleNameChange(value: string) {
    setCycleNameDraft(value);
    if (createCycleError) {
      setCreateCycleError(null);
    }
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

  function resetGroupUIState() {
    setIsCreateGroupModalOpen(false);
    setGroupNameDraft("");
    setCreateGroupError(null);
    setCreatedGroupInvite(null);
    setCreateGroupCopiedState(null);
    setIsJoinGroupModalOpen(false);
    setJoinInviteCodeDraft("");
    setJoinGroupError(null);
    setPendingGroupAction(null);
    setGroupActionError(null);
    setIsCreateCycleModalOpen(false);
    setCycleNameDraft("");
    setCreateCycleError(null);
  }

  return {
    groupFilterMode,
    groupSortMode,
    setGroupFilterMode,
    setGroupSortMode,
    visibleGroups,
    selectedGroup,
    groupMembers,
    cycles,
    selectedCycle,
    archivedCycles,
    canCreateSettlementCycle,
    setSelectedGroup: (group: Group) => {
      setSelectedGroup(group);
      setRequestedGroupID(group.id);
    },
    setSelectedCycle: (cycle: Cycle) => {
      setSelectedCycle(cycle);
      setRequestedCycleID(cycle.id);
    },
    isCreateGroupModalOpen,
    groupNameDraft,
    groupSubmitting,
    createGroupError,
    createdGroupInvite,
    createGroupCopiedState,
    handleCreateGroup,
    handleCloseCreateGroupModal,
    handleSubmitCreateGroup,
    handleResetCreateGroupModal,
    handleCreateGroupNameChange,
    handleCopyCreatedInviteCode,
    handleCopyCreatedInviteLink,
    isJoinGroupModalOpen,
    joinInviteCodeDraft,
    joinSubmitting,
    joinGroupError,
    setJoinInviteCodeDraft,
    handleOpenJoinGroupModal,
    handleCloseJoinGroupModal,
    handleSubmitJoinGroup,
    pendingGroupAction,
    groupActionSubmitting,
    groupActionError,
    setPendingGroupAction,
    handleCloseGroupActionModal,
    handleConfirmGroupAction,
    isCreateCycleModalOpen,
    cycleNameDraft,
    cycleSubmitting,
    createCycleError,
    handleCreateSettlementPeriod,
    handleCycleNameChange,
    handleCloseCreateCycleModal,
    handleSubmitCreateCycle,
    resetGroupUIState,
  };
}
