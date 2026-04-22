import "./CreateSettlementCycleModal.css";

type CreateSettlementCycleModalProps = {
  isOpen: boolean;
  groupName: string | null;
  cycleName: string;
  submitting: boolean;
  errorMessage: string | null;
  onCycleNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CreateSettlementCycleModal({
  isOpen,
  groupName,
  cycleName,
  submitting,
  errorMessage,
  onCycleNameChange,
  onClose,
  onSubmit,
}: CreateSettlementCycleModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="create-cycle-modal-backdrop" onClick={onClose}>
      <div
        className="create-cycle-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-cycle-title"
      >
        <div className="create-cycle-modal-header">
          <div>
            <div className="create-cycle-modal-eyebrow">New Settlement Cycle</div>
            <h2 className="create-cycle-modal-title" id="create-cycle-title">
              Create Settlement Cycle
            </h2>
            <p className="create-cycle-modal-copy">
              {groupName
                ? `Open a new Settlement Cycle for ${groupName}.`
                : "Open a new Settlement Cycle for the selected group."}
            </p>
          </div>
          <button
            className="create-cycle-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close create settlement cycle dialog"
          >
            ×
          </button>
        </div>

        <div className="create-cycle-modal-body">
          <label className="create-cycle-modal-field">
            <span className="create-cycle-modal-label">Settlement Cycle Name</span>
            <input
              className="create-cycle-modal-input"
              type="text"
              value={cycleName}
              onChange={(event) => onCycleNameChange(event.target.value)}
              placeholder="Weekend Trip"
              maxLength={80}
              autoFocus
            />
          </label>
          {errorMessage && <p className="create-cycle-modal-error">{errorMessage}</p>}
        </div>

        <div className="create-cycle-modal-actions">
          <button
            className="btn btn-secondary create-cycle-modal-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary create-cycle-modal-button"
            type="button"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Settlement Cycle"}
          </button>
        </div>
      </div>
    </div>
  );
}
