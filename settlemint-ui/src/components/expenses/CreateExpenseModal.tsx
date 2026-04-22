import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupMember } from "../../shared/types";
import "./CreateExpenseModal.css";

type CreateExpenseModalProps = {
  isOpen: boolean;
  groupName: string | null;
  cycleName: string | null;
  members: GroupMember[];
  defaultPaidByWallet: string | null;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    amount: number;
    paidByWallet: string;
    splits: Array<{
      walletAddress: string;
      amount: number;
    }>;
  }) => void;
};

type SplitMode = "equal" | "custom";

export default function CreateExpenseModal({
  isOpen,
  groupName,
  cycleName,
  members,
  defaultPaidByWallet,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: CreateExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByWallet, setPaidByWallet] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedWallets, setSelectedWallets] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPaidByMenuOpen, setIsPaidByMenuOpen] = useState(false);
  const paidByMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextSelectedWallets: Record<string, boolean> = {};
    const nextCustomAmounts: Record<string, string> = {};

    members.forEach((member) => {
      nextSelectedWallets[member.walletAddress] = true;
      nextCustomAmounts[member.walletAddress] = "";
    });

    setDescription("");
    setAmount("");
    setSplitMode("equal");
    setSelectedWallets(nextSelectedWallets);
    setCustomAmounts(nextCustomAmounts);
    setPaidByWallet(resolveDefaultPaidByWallet(members, defaultPaidByWallet));
    setLocalError(null);
    setIsPaidByMenuOpen(false);
  }, [defaultPaidByWallet, isOpen, members]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (paidByMenuRef.current && !paidByMenuRef.current.contains(event.target as Node)) {
        setIsPaidByMenuOpen(false);
      }
    }

    if (isPaidByMenuOpen) {
      window.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isPaidByMenuOpen]);

  const includedMembers = useMemo(
    () => members.filter((member) => selectedWallets[member.walletAddress]),
    [members, selectedWallets],
  );
  const amountCents = parseCurrencyToCents(amount);
  const equalSplitPreview =
    amountCents !== null && includedMembers.length > 0
      ? splitAmountEvenly(
          includedMembers.map((member) => member.walletAddress),
          amountCents,
        )
      : [];
  const customTotalCents = includedMembers.reduce((sum, member) => {
    const value = parseCurrencyToCents(customAmounts[member.walletAddress] || "");
    return sum + (value ?? 0);
  }, 0);
  const customDifferenceCents = amountCents === null ? null : amountCents - customTotalCents;
  const paidByMember =
    members.find((member) => member.walletAddress === paidByWallet) ?? members[0] ?? null;

  if (!isOpen) {
    return null;
  }

  function handleSubmit() {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setLocalError("Expense description is required.");
      return;
    }

    if (amountCents === null || amountCents <= 0) {
      setLocalError("Enter a valid amount with up to two decimals.");
      return;
    }

    if (!paidByWallet) {
      setLocalError("Choose who paid for the expense.");
      return;
    }

    if (includedMembers.length === 0) {
      setLocalError("Select at least one member in the split.");
      return;
    }

    let splits: Array<{ walletAddress: string; amount: number }>;

    if (splitMode === "equal") {
      splits = equalSplitPreview.map((split) => ({
        walletAddress: split.walletAddress,
        amount: centsToCurrency(split.amountCents),
      }));
    } else {
      if (customDifferenceCents !== 0) {
        setLocalError("Custom split amounts must add up to the total expense.");
        return;
      }

      splits = includedMembers.map((member) => {
        const splitAmountCents = parseCurrencyToCents(customAmounts[member.walletAddress] || "");
        return {
          walletAddress: member.walletAddress,
          amount: centsToCurrency(splitAmountCents ?? 0),
        };
      });
    }

    setLocalError(null);
    onSubmit({
      description: trimmedDescription,
      amount: centsToCurrency(amountCents),
      paidByWallet,
      splits,
    });
  }

  return (
    <div className="create-expense-modal-backdrop" onClick={onClose}>
      <div
        className="create-expense-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-expense-title"
      >
        <div className="create-expense-modal-header">
          <div>
            <div className="create-expense-modal-eyebrow">New Expense</div>
            <h2 className="create-expense-modal-title" id="create-expense-title">
              Add Expense
            </h2>
            <p className="create-expense-modal-copy">
              {groupName && cycleName
                ? `Add an expense to ${groupName} inside the ${cycleName} cycle.`
                : "Record a shared expense and define how it should be split."}
            </p>
          </div>
          <button
            className="create-expense-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close create expense dialog"
          >
            ×
          </button>
        </div>

        <div className="create-expense-modal-body">
          <div className="create-expense-modal-grid">
            <label className="create-expense-modal-field create-expense-modal-field-wide">
              <span className="create-expense-modal-label">Description</span>
              <input
                className="create-expense-modal-input"
                type="text"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                placeholder="Dinner, gas, groceries..."
                maxLength={120}
                autoFocus
              />
            </label>

            <label className="create-expense-modal-field">
              <span className="create-expense-modal-label">Total Amount</span>
              <input
                className="create-expense-modal-input"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                placeholder="0.00"
              />
            </label>

            <div className="create-expense-modal-field">
              <span className="create-expense-modal-label">Paid By</span>
              <div className="create-expense-modal-dropdown-anchor" ref={paidByMenuRef}>
                <button
                  className={`create-expense-modal-select-button ${isPaidByMenuOpen ? "active" : ""}`}
                  type="button"
                  onClick={() => setIsPaidByMenuOpen((currentValue) => !currentValue)}
                  aria-haspopup="listbox"
                  aria-expanded={isPaidByMenuOpen}
                >
                  <span>
                    {paidByMember
                      ? paidByMember.displayName.trim() || shortWallet(paidByMember.walletAddress)
                      : "Select payer"}
                  </span>
                  <span className="create-expense-modal-select-chevron" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {isPaidByMenuOpen && (
                  <div
                    className="create-expense-modal-dropdown-menu"
                    role="listbox"
                    aria-label="Paid by member"
                  >
                    {members.map((member) => {
                      const isActive = member.walletAddress === paidByWallet;

                      return (
                        <button
                          key={member.walletAddress}
                          className={`create-expense-modal-dropdown-option ${isActive ? "active" : ""}`}
                          type="button"
                          onClick={() => {
                            setPaidByWallet(member.walletAddress);
                            setIsPaidByMenuOpen(false);
                            if (localError) {
                              setLocalError(null);
                            }
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <span className="create-expense-modal-dropdown-option-check" aria-hidden="true">
                            {isActive ? "✓" : ""}
                          </span>
                          <span>
                            {member.displayName.trim() || shortWallet(member.walletAddress)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="create-expense-modal-split-header">
            <div>
              <div className="create-expense-modal-label">Split Mode</div>
              <div className="create-expense-modal-hint">
                Equal split divides the total automatically. Custom lets you set each share.
              </div>
            </div>
            <div className="create-expense-modal-toggle-row">
              <button
                className={`create-expense-modal-toggle ${splitMode === "equal" ? "active" : ""}`}
                type="button"
                onClick={() => setSplitMode("equal")}
              >
                Equal
              </button>
              <button
                className={`create-expense-modal-toggle ${splitMode === "custom" ? "active" : ""}`}
                type="button"
                onClick={() => setSplitMode("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="create-expense-modal-members">
            {members.map((member) => {
              const isIncluded = Boolean(selectedWallets[member.walletAddress]);
              const equalShare = equalSplitPreview.find(
                (split) => split.walletAddress === member.walletAddress,
              );

              return (
                <div className={`create-expense-modal-member ${isIncluded ? "active" : ""}`} key={member.walletAddress}>
                  <label className="create-expense-modal-member-main">
                    <input
                      className="create-expense-modal-checkbox"
                      type="checkbox"
                      checked={isIncluded}
                      onChange={(event) => {
                        setSelectedWallets((currentWallets) => ({
                          ...currentWallets,
                          [member.walletAddress]: event.target.checked,
                        }));
                        if (localError) {
                          setLocalError(null);
                        }
                      }}
                    />
                    <div>
                      <div className="create-expense-modal-member-name">
                        {member.displayName.trim() || "Unnamed member"}
                      </div>
                      <div className="create-expense-modal-member-wallet">
                        {shortWallet(member.walletAddress)}
                      </div>
                    </div>
                  </label>

                  {splitMode === "equal" ? (
                    <div className="create-expense-modal-share-pill">
                      {isIncluded && equalShare ? formatCurrency(equalShare.amountCents / 100) : "Excluded"}
                    </div>
                  ) : (
                    <input
                      className="create-expense-modal-share-input"
                      type="text"
                      inputMode="decimal"
                      value={customAmounts[member.walletAddress] || ""}
                      onChange={(event) => {
                        setCustomAmounts((currentAmounts) => ({
                          ...currentAmounts,
                          [member.walletAddress]: event.target.value,
                        }));
                        if (localError) {
                          setLocalError(null);
                        }
                      }}
                      placeholder="0.00"
                      disabled={!isIncluded}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="create-expense-modal-summary">
            <span>{includedMembers.length} members in split</span>
            <span>
              {splitMode === "equal"
                ? amountCents === null
                  ? "Enter an amount to preview the split."
                  : `Equal split across selected members.`
                : customDifferenceCents === 0
                  ? "Custom totals are balanced."
                  : `Remaining difference: ${formatCurrency((customDifferenceCents ?? 0) / 100)}`}
            </span>
          </div>

          {(localError || errorMessage) && (
            <p className="create-expense-modal-error">{localError || errorMessage}</p>
          )}
        </div>

        <div className="create-expense-modal-actions">
          <button
            className="btn btn-secondary create-expense-modal-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary create-expense-modal-button"
            type="button"
            onClick={handleSubmit}
            disabled={submitting || members.length === 0}
          >
            {submitting ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveDefaultPaidByWallet(members: GroupMember[], defaultPaidByWallet: string | null) {
  if (defaultPaidByWallet && members.some((member) => member.walletAddress === defaultPaidByWallet)) {
    return defaultPaidByWallet;
  }

  return members[0]?.walletAddress || "";
}

function parseCurrencyToCents(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (!/^\d+(\.\d{0,2})?$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.round(parsedValue * 100);
}

function splitAmountEvenly(walletAddresses: string[], totalAmountCents: number) {
  const baseAmount = Math.floor(totalAmountCents / walletAddresses.length);
  const remainder = totalAmountCents % walletAddresses.length;

  return walletAddresses.map((walletAddress, index) => ({
    walletAddress,
    amountCents: baseAmount + (index < remainder ? 1 : 0),
  }));
}

function centsToCurrency(value: number) {
  return value / 100;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function shortWallet(walletAddress: string) {
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
}
