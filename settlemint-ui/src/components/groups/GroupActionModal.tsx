import "./GroupActionModal.css";

type GroupActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  submittingLabel: string;
  submitting: boolean;
  tone?: "default" | "danger";
  onClose: () => void;
  onConfirm: () => void;
};

export default function GroupActionModal({
  isOpen,
  title,
  description,
  confirmLabel,
  submittingLabel,
  submitting,
  tone = "default",
  onClose,
  onConfirm,
}: GroupActionModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="group-action-modal-backdrop" onClick={onClose}>
      <div
        className="group-action-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-action-modal-title"
      >
        <div className="group-action-modal-header">
          <div>
            <div className={`group-action-modal-eyebrow ${tone === "danger" ? "danger" : ""}`}>
              {tone === "danger" ? "Delete Group" : "Leave Group"}
            </div>
            <h2 className="group-action-modal-title" id="group-action-modal-title">
              {title}
            </h2>
            <p className="group-action-modal-copy">{description}</p>
          </div>
          <button
            className="group-action-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close group action dialog"
          >
            ×
          </button>
        </div>

        <div className="group-action-modal-actions">
          <button
            className="btn btn-secondary group-action-modal-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={`btn ${tone === "danger" ? "group-action-modal-button-danger" : "btn-primary"} group-action-modal-button`}
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? submittingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
