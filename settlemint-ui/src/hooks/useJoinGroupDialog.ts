import { useEffect, useState } from "react";
import { joinGroup } from "../api/groups";
import { extractInviteCode, formatErrorMessage } from "../lib/appHelpers";
import type { Group } from "../shared/types";

type UseJoinGroupDialogInput = {
  accessToken: string | null;
  inviteFromUrl: string;
  setInviteFromUrl: (value: string) => void;
  onGroupJoined: (group: Group) => void;
};

export function useJoinGroupDialog({
  accessToken,
  inviteFromUrl,
  setInviteFromUrl,
  onGroupJoined,
}: UseJoinGroupDialogInput) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !inviteFromUrl) {
      return;
    }

    setInviteCode(inviteFromUrl);
    setErrorMessage(null);
    setIsOpen(true);
  }, [accessToken, inviteFromUrl]);

  function reset() {
    setIsOpen(false);
    setInviteCode("");
    setSubmitting(false);
    setErrorMessage(null);
  }

  function open() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function close() {
    if (submitting) {
      return;
    }

    setIsOpen(false);
    setErrorMessage(null);
    if (!inviteFromUrl) {
      setInviteCode("");
    }
  }

  function updateInviteCode(value: string) {
    setInviteCode(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  async function submit() {
    const normalizedInviteCode = extractInviteCode(inviteCode);
    if (!normalizedInviteCode) {
      setErrorMessage("Invite code is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await joinGroup({ inviteCode: normalizedInviteCode });
      onGroupJoined(result.group);
      setIsOpen(false);
      setInviteCode("");
      setInviteFromUrl("");
      clearInviteQueryParam();
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to join group"));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    isOpen,
    inviteCode,
    submitting,
    errorMessage,
    open,
    close,
    reset,
    updateInviteCode,
    submit,
  };
}

function clearInviteQueryParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url.toString());
}
