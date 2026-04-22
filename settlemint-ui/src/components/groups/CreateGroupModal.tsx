import type { Group } from "../../shared/types";
import "./CreateGroupModal.css";

type CreateGroupModalProps = {
  isOpen: boolean;
  groupName: string;
  submitting: boolean;
  createdGroup: Group | null;
  copiedState: "code" | "link" | null;
  errorMessage: string | null;
  onGroupNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onCopyInviteCode: () => void;
  onCopyInviteLink: () => void;
};

export default function CreateGroupModal({
  isOpen,
  groupName,
  submitting,
  createdGroup,
  copiedState,
  errorMessage,
  onGroupNameChange,
  onClose,
  onSubmit,
  onReset,
  onCopyInviteCode,
  onCopyInviteLink,
}: CreateGroupModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="create-group-modal-backdrop" onClick={onClose}>
      <div
        className="create-group-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
      >
        <div className="create-group-modal-header">
          <div>
            <div className="create-group-modal-eyebrow">
              {createdGroup ? "Invite Members" : "New Group"}
            </div>
            <h2 className="create-group-modal-title" id="create-group-title">
              {createdGroup ? "Group Created" : "Create Group"}
            </h2>
            <p className="create-group-modal-copy">
              {createdGroup
                ? `Share this invite code so others can join ${createdGroup.name}.`
                : "Start a new group to invite members and organize Settlement Cycles."}
            </p>
          </div>
          <button
            className="create-group-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close create group dialog"
          >
            ×
          </button>
        </div>

        {!createdGroup ? (
          <>
            <div className="create-group-modal-body">
              <label className="create-group-modal-field">
                <span className="create-group-modal-label">Group Name</span>
                <input
                  className="create-group-modal-input"
                  type="text"
                  value={groupName}
                  onChange={(event) => onGroupNameChange(event.target.value)}
                  placeholder="Weekend Trip"
                  maxLength={80}
                  autoFocus
                />
              </label>
              {errorMessage && <p className="create-group-modal-error">{errorMessage}</p>}
            </div>

            <div className="create-group-modal-actions">
              <button
                className="btn btn-secondary create-group-modal-button"
                type="button"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary create-group-modal-button"
                type="button"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Group"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="create-group-modal-body">
              <div className="create-group-modal-success-card">
                <div className="create-group-modal-label">Invite Code</div>
                <button
                  className="create-group-modal-code"
                  type="button"
                  onClick={onCopyInviteCode}
                  title="Copy invite code"
                >
                  {createdGroup.inviteCode}
                </button>
                <div className="create-group-modal-helper-row">
                  <span className="create-group-modal-helper-text">
                    Teammates can paste just this code into Join Group.
                  </span>
                  {copiedState === "code" && (
                    <span className="create-group-modal-copy-badge">Copied</span>
                  )}
                </div>
              </div>

              <div className="create-group-modal-secondary-share">
                <div>
                  <div className="create-group-modal-label">Optional Share Link</div>
                  <div className="create-group-modal-secondary-copy">
                    Use this if you want the invite to pre-fill automatically.
                  </div>
                </div>
                <button
                  className="btn btn-secondary create-group-modal-secondary-button"
                  type="button"
                  onClick={onCopyInviteLink}
                >
                  {copiedState === "link" ? "Copied Link" : "Copy Link"}
                </button>
              </div>
            </div>

            <div className="create-group-modal-actions">
              <button
                className="btn btn-secondary create-group-modal-button"
                type="button"
                onClick={onReset}
              >
                Create Another
              </button>
              <button
                className="btn btn-primary create-group-modal-button"
                type="button"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
