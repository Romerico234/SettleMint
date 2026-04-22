import { useState } from "react";
import { createGroup } from "../api/groups";
import { formatErrorMessage } from "../lib/appHelpers";
import type { Group } from "../shared/types";

type UseCreateGroupDialogInput = {
  inviteBaseUrl: string;
  onGroupCreated: (group: Group) => void;
};

export function useCreateGroupDialog({
  inviteBaseUrl,
  onGroupCreated,
}: UseCreateGroupDialogInput) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [copiedState, setCopiedState] = useState<"code" | "link" | null>(null);

  function reset() {
    setIsOpen(false);
    setName("");
    setSubmitting(false);
    setErrorMessage(null);
    setCreatedGroup(null);
    setCopiedState(null);
  }

  function open() {
    reset();
    setIsOpen(true);
  }

  function close() {
    if (submitting) {
      return;
    }

    reset();
  }

  function updateName(value: string) {
    setName(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Group name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createGroup({ name: trimmedName });
      onGroupCreated(result.group);
      setName("");
      setCreatedGroup(result.group);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to create group"));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInviteCode() {
    if (!createdGroup) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdGroup.inviteCode);
      flashCopiedState("code", setCopiedState);
    } catch {
      setCopiedState(null);
    }
  }

  async function copyInviteLink() {
    if (!createdGroup) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${inviteBaseUrl}?invite=${createdGroup.inviteCode}`);
      flashCopiedState("link", setCopiedState);
    } catch {
      setCopiedState(null);
    }
  }

  return {
    isOpen,
    name,
    submitting,
    errorMessage,
    createdGroup,
    copiedState,
    open,
    close,
    reset,
    updateName,
    submit,
    copyInviteCode,
    copyInviteLink,
  };
}

function flashCopiedState(
  nextState: "code" | "link",
  setCopiedState: React.Dispatch<React.SetStateAction<"code" | "link" | null>>,
) {
  setCopiedState(nextState);
  window.setTimeout(() => {
    setCopiedState((currentState) => (currentState === nextState ? null : currentState));
  }, 1800);
}
