import { useEffect, useMemo, useState } from "react";
import { closeSettlementCycle, fetchGroupCycles, fetchMyCycleArchives } from "../api/cycles";
import { fetchGroupMembers, fetchMyGroups } from "../api/groups";
import { useCreateCycleDialog } from "./useCreateCycleDialog";
import { useCreateGroupDialog } from "./useCreateGroupDialog";
import { useGroupActionDialog } from "./useGroupActionDialog";
import { useJoinGroupDialog } from "./useJoinGroupDialog";
import { formatErrorMessage } from "../lib/appHelpers";
import type {
  Cycle,
  CycleArchive,
  Group,
  GroupFilterMode,
  GroupMember,
  GroupSortMode,
} from "../shared/types";

type UseGroupDirectoryInput = {
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

export function useGroupDirectory({
  accessToken,
  walletAddress,
  requestedGroupID,
  setRequestedGroupID,
  requestedCycleID,
  setRequestedCycleID,
  inviteFromUrl,
  setInviteFromUrl,
  inviteBaseUrl,
}: UseGroupDirectoryInput) {
  const [filterMode, setFilterMode] = useState<GroupFilterMode>("all");
  const [sortMode, setSortMode] = useState<GroupSortMode>("date");
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [settlementCycles, setSettlementCycles] = useState<Cycle[]>([]);
  const [archivedCycles, setArchivedCycles] = useState<CycleArchive[]>([]);
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [cycleClosing, setCycleClosing] = useState(false);
  const [cycleActionErrorMessage, setCycleActionErrorMessage] = useState<string | null>(null);

  const visibleGroups = useMemo(() => {
    const nextGroups = groups.filter((group) => {
      if (filterMode === "owned") {
        return group.currentUserRole === "owner";
      }

      if (filterMode === "member") {
        return group.currentUserRole === "member";
      }

      return true;
    });

    return nextGroups.sort((leftGroup, rightGroup) => {
      if (sortMode === "name") {
        return leftGroup.name.localeCompare(rightGroup.name);
      }

      return new Date(rightGroup.createdAt).getTime() - new Date(leftGroup.createdAt).getTime();
    });
  }, [groups, filterMode, sortMode]);

  const canCreateCycle =
    Boolean(accessToken && currentGroup && walletAddress) &&
    (currentGroup?.currentUserRole === "owner" ||
      currentGroup?.ownerWallet.toLowerCase() === walletAddress?.toLowerCase());
  const canCloseCycle =
    canCreateCycle &&
    Boolean(currentGroup && currentCycle && currentCycle.status === "Active");

  function selectGroup(group: Group) {
    setCurrentGroup(group);
    setRequestedGroupID(group.id);
  }

  function selectCycle(cycle: Cycle) {
    setCurrentCycle(cycle);
    setRequestedCycleID(cycle.id);
    setCycleActionErrorMessage(null);
  }

  function upsertGroup(nextGroup: Group) {
    setGroups((currentGroups) => upsertByID(currentGroups, nextGroup));
    selectGroup(nextGroup);
  }

  function removeGroup(groupID: string) {
    setGroups((currentGroups) => {
      const nextGroups = currentGroups.filter((group) => group.id !== groupID);
      setCurrentGroup((selectedGroup) =>
        selectedGroup?.id === groupID ? nextGroups[0] ?? null : selectedGroup,
      );
      return nextGroups;
    });
    setRequestedGroupID("");
  }

  function upsertCycle(nextCycle: Cycle) {
    setSettlementCycles((currentCycles) => upsertByID(currentCycles, nextCycle));
    selectCycle(nextCycle);
  }

  function removeCycle(cycleID: string) {
    setSettlementCycles((currentCycles) => {
      const nextCycles = currentCycles.filter((cycle) => cycle.id !== cycleID);
      setCurrentCycle((selectedCycle) =>
        selectedCycle?.id === cycleID ? nextCycles[0] ?? null : selectedCycle,
      );
      return nextCycles;
    });
    setRequestedCycleID("");
  }

  const createGroupDialog = useCreateGroupDialog({
    inviteBaseUrl,
    onGroupCreated: upsertGroup,
  });

  const joinGroupDialog = useJoinGroupDialog({
    accessToken,
    inviteFromUrl,
    setInviteFromUrl,
    onGroupJoined: upsertGroup,
  });

  const groupActionDialog = useGroupActionDialog({
    selectedGroup: currentGroup,
    onGroupRemoved: removeGroup,
  });

  const createCycleDialog = useCreateCycleDialog({
    selectedGroup: currentGroup,
    onCycleCreated: upsertCycle,
  });

  useEffect(() => {
    if (!accessToken) {
      setGroups([]);
      setCurrentGroup(null);
      setGroupMembers([]);
      setSettlementCycles([]);
      setArchivedCycles([]);
      setCurrentCycle(null);
      return;
    }

    let mounted = true;

    fetchMyGroups()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setGroups(result.groups);
        setCurrentGroup((selectedGroup) =>
          resolveSelection(result.groups, selectedGroup, requestedGroupID),
        );
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setGroups([]);
        setCurrentGroup(null);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, requestedGroupID]);

  useEffect(() => {
    if (!accessToken) {
      setArchivedCycles([]);
      return;
    }

    let mounted = true;

    fetchMyCycleArchives()
      .then((result) => {
        if (mounted) {
          setArchivedCycles(result.archives);
        }
      })
      .catch(() => {
        if (mounted) {
          setArchivedCycles([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !currentGroup) {
      setSettlementCycles([]);
      setCurrentCycle(null);
      return;
    }

    let mounted = true;

    fetchGroupCycles(currentGroup.id)
      .then((cyclesResult) => {
        if (!mounted) {
          return;
        }

        setSettlementCycles(cyclesResult.cycles);
        setCurrentCycle((selectedCycle) =>
          resolveSelection(cyclesResult.cycles, selectedCycle, requestedCycleID),
        );
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setSettlementCycles([]);
        setCurrentCycle(null);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, currentGroup?.id, requestedCycleID]);

  useEffect(() => {
    if (!accessToken || !currentGroup) {
      setGroupMembers([]);
      return;
    }

    let mounted = true;

    fetchGroupMembers(currentGroup.id)
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
  }, [accessToken, currentGroup?.id]);

  useEffect(() => {
    if (visibleGroups.length === 0) {
      setCurrentGroup(null);
      return;
    }

    setCurrentGroup((selectedGroup) => {
      if (selectedGroup && visibleGroups.some((group) => group.id === selectedGroup.id)) {
        return selectedGroup;
      }

      return visibleGroups.find((group) => group.id === requestedGroupID) ?? visibleGroups[0];
    });
  }, [visibleGroups, requestedGroupID]);

  function resetUiState() {
    createGroupDialog.reset();
    joinGroupDialog.reset();
    groupActionDialog.reset();
    createCycleDialog.reset();
    setCycleActionErrorMessage(null);
    setCycleClosing(false);
  }

  async function closeCurrentCycle() {
    if (!currentGroup || !currentCycle) {
      return null;
    }

    setCycleClosing(true);
    setCycleActionErrorMessage(null);

    try {
      const result = await closeSettlementCycle(currentGroup.id, currentCycle.id);
      setArchivedCycles((currentArchives) => upsertByID(currentArchives, result.archive));
      removeCycle(currentCycle.id);
      return result.archive;
    } catch (error) {
      setCycleActionErrorMessage(formatErrorMessage(error, "Failed to close settlement cycle"));
      return null;
    } finally {
      setCycleClosing(false);
    }
  }

  return {
    filters: {
      mode: filterMode,
      sortMode,
      setMode: setFilterMode,
      setSortMode,
    },
    groups: {
      list: visibleGroups,
      current: currentGroup,
      members: groupMembers,
      select: selectGroup,
    },
    cycles: {
      list: settlementCycles,
      current: currentCycle,
      archived: archivedCycles,
      select: selectCycle,
      canCreate: canCreateCycle,
      canClose: canCloseCycle,
      close: closeCurrentCycle,
      closing: cycleClosing,
      actionErrorMessage: cycleActionErrorMessage,
    },
    dialogs: {
      createGroup: createGroupDialog,
      joinGroup: joinGroupDialog,
      groupAction: groupActionDialog,
      createCycle: createCycleDialog,
    },
    resetUiState,
  };
}

function upsertByID<T extends { id: string }>(items: T[], nextItem: T) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  const nextItems = [...items];
  nextItems[existingIndex] = nextItem;
  return nextItems;
}

function resolveSelection<T extends { id: string }>(
  items: T[],
  selectedItem: T | null,
  requestedID: string,
) {
  const requestedItem = items.find((item) => item.id === requestedID) ?? null;
  if (selectedItem) {
    return items.find((item) => item.id === selectedItem.id) ?? requestedItem ?? items[0] ?? null;
  }

  return requestedItem ?? items[0] ?? null;
}
