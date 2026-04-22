import "./JoinGroupModal.css";

type JoinGroupModalProps = {
  isOpen: boolean;
  inviteCode: string;
  submitting: boolean;
  errorMessage: string | null;
  onInviteCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JoinGroupModal({
  isOpen,
  inviteCode,
  submitting,
  errorMessage,
  onInviteCodeChange,
  onClose,
  onSubmit,
}: JoinGroupModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="join-group-modal-backdrop" onClick={onClose}>
      <div
        className="join-group-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-group-title"
      >
        <div className="join-group-modal-header">
          <div>
            <div className="join-group-modal-eyebrow">Accept Invite</div>
            <h2 className="join-group-modal-title" id="join-group-title">
              Join Group
            </h2>
            <p className="join-group-modal-copy">
              Paste an invite code or open a shared invite link to join an existing group.
            </p>
          </div>
          <button
            className="join-group-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close join group dialog"
          >
            ×
          </button>
        </div>

        <div className="join-group-modal-body">
          <label className="join-group-modal-field">
            <span className="join-group-modal-label">Invite Code</span>
            <input
              className="join-group-modal-input"
              type="text"
              value={inviteCode}
              onChange={(event) => onInviteCodeChange(event.target.value)}
              placeholder="inv_ab12cd34ef56"
              maxLength={80}
              autoFocus
            />
          </label>
          {errorMessage && <p className="join-group-modal-error">{errorMessage}</p>}
        </div>

        <div className="join-group-modal-actions">
          <button
            className="btn btn-secondary join-group-modal-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary join-group-modal-button"
            type="button"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Joining..." : "Join Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
