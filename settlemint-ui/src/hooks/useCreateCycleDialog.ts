import { useState } from "react";
import { createSettlementCycle } from "../api/cycles";
import { formatErrorMessage } from "../lib/appHelpers";
import type { Cycle, Group } from "../shared/types";

type UseCreateCycleDialogInput = {
  selectedGroup: Group | null;
  onCycleCreated: (cycle: Cycle) => void;
};

export function useCreateCycleDialog({
  selectedGroup,
  onCycleCreated,
}: UseCreateCycleDialogInput) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function open() {
    setErrorMessage(null);
    setName("");
    setIsOpen(true);
  }

  function close() {
    if (submitting) {
      return;
    }

    reset();
  }

  function reset() {
    setIsOpen(false);
    setName("");
    setSubmitting(false);
    setErrorMessage(null);
  }

  function updateName(value: string) {
    setName(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  async function submit() {
    if (!selectedGroup) {
      setErrorMessage("A group must be selected.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Settlement Cycle name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createSettlementCycle(selectedGroup.id, { name: trimmedName });
      onCycleCreated(result.cycle);
      setIsOpen(false);
      setName("");
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to create Settlement Cycle"));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    isOpen,
    name,
    submitting,
    errorMessage,
    open,
    close,
    reset,
    updateName,
    submit,
  };
}
