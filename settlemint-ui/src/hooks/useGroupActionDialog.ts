import { useMemo, useState } from "react";
import { deleteGroup, leaveGroup } from "../api/groups";
import { formatErrorMessage } from "../lib/appHelpers";
import type { Group } from "../shared/types";

export type GroupActionType = "leave" | "delete";

type UseGroupActionDialogInput = {
  selectedGroup: Group | null;
  onGroupRemoved: (groupID: string) => void;
};

export function useGroupActionDialog({
  selectedGroup,
  onGroupRemoved,
}: UseGroupActionDialogInput) {
  const [action, setAction] = useState<GroupActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalCopy = useMemo(() => {
    if (action === "delete") {
      return {
        title: `Delete ${selectedGroup ? `"${selectedGroup.name}"` : "group"}?`,
        description: "This is only allowed when no other members remain in the group.",
        confirmLabel: "Delete Group",
        submittingLabel: "Deleting...",
        tone: "danger" as const,
      };
    }

    return {
      title: `Leave ${selectedGroup ? `"${selectedGroup.name}"` : "group"}?`,
      description: "You will lose access to this group until someone invites you again.",
      confirmLabel: "Leave Group",
      submittingLabel: "Leaving...",
      tone: "default" as const,
    };
  }, [action, selectedGroup]);

  function request(nextAction: GroupActionType) {
    setAction(nextAction);
    setErrorMessage(null);
  }

  function close() {
    if (submitting) {
      return;
    }

    setAction(null);
    setErrorMessage(null);
  }

  function reset() {
    setAction(null);
    setSubmitting(false);
    setErrorMessage(null);
  }

  async function confirm() {
    if (!selectedGroup || !action) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (action === "leave") {
        await leaveGroup(selectedGroup.id);
      } else {
        await deleteGroup(selectedGroup.id);
      }

      onGroupRemoved(selectedGroup.id);
      setAction(null);
    } catch (error) {
      setErrorMessage(
        formatErrorMessage(
          error,
          action === "leave" ? "Failed to leave group" : "Failed to delete group",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    isOpen: action !== null,
    action,
    submitting,
    errorMessage,
    title: modalCopy.title,
    description: modalCopy.description,
    confirmLabel: modalCopy.confirmLabel,
    submittingLabel: modalCopy.submittingLabel,
    tone: modalCopy.tone,
    request,
    close,
    reset,
    confirm,
  };
}
