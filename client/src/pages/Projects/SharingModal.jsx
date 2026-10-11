import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useUser } from "../../context/UserContext";
import {
  fetchCollaborators,
  inviteCollaborator,
  revokeInvitation,
  removeCollaborator,
} from "../../api/projectSharingApi";

export default function SharingModal({
  projectId,
  onClose,
  onSharedChange,
}) {
  const { user } = useUser();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");

  const currentUserId = user?.id || null;

  useEffect(() => {
    let cancelled = false;

    fetchCollaborators(projectId)
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded || null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError.message ||
              "Failed to load sharing details.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function refresh() {
    const loaded = await fetchCollaborators(projectId);
    setData(loaded || null);
  }

  async function runAction(action) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const message = await action();
      setNotice(message || "");
      await refresh();

      if (typeof onSharedChange === "function") {
        onSharedChange();
      }
    } catch (actionError) {
      setError(
        actionError.message ||
          "The action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleInvite(event) {
    event.preventDefault();

    const email = inviteEmail.trim();

    if (!email) {
      setError("Enter the email of the person to invite.");
      return;
    }

    return runAction(async () => {
      await inviteCollaborator(projectId, email);
      setInviteEmail("");
      return `Invitation sent to ${email}.`;
    });
  }

  function handleRevoke(invitation) {
    return runAction(async () => {
      await revokeInvitation(projectId, invitation.id);
      return "Invitation revoked.";
    });
  }

  function handleRemove(collaborator, isOwner) {
    const isSelf =
      String(collaborator.id) === String(currentUserId);

    return runAction(async () => {
      await removeCollaborator(projectId, collaborator.id);
      return isSelf && !isOwner
        ? "You have left the project."
        : "Collaborator removed.";
    });
  }

  const owner = data?.owner || null;
  const collaborators = Array.isArray(data?.collaborators)
    ? data.collaborators
    : [];
  const invitations = Array.isArray(data?.invitations)
    ? data.invitations
    : [];
  const isOwner =
    Boolean(data?.project?.ownerId) &&
    String(data.project.ownerId) === String(currentUserId);

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <div
        className="modal sharing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sharing-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2
              className="modal-title"
              id="sharing-modal-title"
            >
              Share Project
            </h2>

            <p className="entry-intro">
              Invite people by email. Accepted
              collaborators can view and manage this
              project like their own.
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="sharing-banner sharing-banner--error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="sharing-banner sharing-banner--success" role="status">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="sharing-loading">
            Loading sharing details...
          </div>
        ) : (
          <>
            <form
              className="sharing-invite-form"
              onSubmit={handleInvite}
            >
              <input
                type="email"
                className="sharing-invite-input"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(event) =>
                  setInviteEmail(event.target.value)
                }
                aria-label="Invitee email"
                disabled={busy}
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !inviteEmail.trim()}
              >
                Invite
              </button>
            </form>

            {owner && (
              <section className="sharing-section">
                <h3 className="sharing-section-title">
                  Owner
                </h3>

                <div className="sharing-row">
                  <div className="sharing-row-info">
                    <strong>{owner.name || "Owner"}</strong>
                    <span>{owner.email}</span>
                  </div>

                  <span className="sharing-badge">
                    Owner
                  </span>
                </div>
              </section>
            )}

            <section className="sharing-section">
              <h3 className="sharing-section-title">
                Collaborators
              </h3>

              {collaborators.length === 0 ? (
                <p className="sharing-empty">
                  No collaborators yet. Invite someone
                  to start sharing this project.
                </p>
              ) : (
                <div className="sharing-list">
                  {collaborators.map((collaborator) => {
                    const isSelf =
                      String(collaborator.id) ===
                      String(currentUserId);

                    return (
                      <div
                        className="sharing-row"
                        key={collaborator.id}
                      >
                        <div className="sharing-row-info">
                          <strong>
                            {collaborator.name ||
                              collaborator.email}
                          </strong>
                          <span>{collaborator.email}</span>
                        </div>

                        <div className="sharing-row-actions">
                          {(isOwner || isSelf) && (
                            <button
                              type="button"
                              className="btn-remove-field"
                              onClick={() =>
                                handleRemove(
                                  collaborator,
                                  isOwner,
                                )
                              }
                              disabled={busy}
                            >
                              {isSelf && !isOwner
                                ? "Leave"
                                : "Remove"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="sharing-section">
              <h3 className="sharing-section-title">
                Pending invitations
              </h3>

              {invitations.length === 0 ? (
                <p className="sharing-empty">
                  No pending invitations.
                </p>
              ) : (
                <div className="sharing-list">
                  {invitations.map((invitation) => (
                    <div
                      className="sharing-row"
                      key={invitation.id}
                    >
                      <div className="sharing-row-info">
                        <strong>
                          {invitation.inviteeEmail}
                        </strong>
                        <span>
                          Invited by{" "}
                          {invitation.inviterName ||
                            invitation.inviterEmail ||
                            "a collaborator"}
                        </span>
                      </div>

                      <div className="sharing-row-actions">
                        <button
                          type="button"
                          className="btn-remove-field"
                          onClick={() =>
                            handleRevoke(invitation)
                          }
                          disabled={busy}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <style>{`
          .sharing-modal {
            max-width: 560px;
          }

          .sharing-banner {
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 14px;
          }

          .sharing-banner--error {
            border: 1px solid #fecaca;
            background: #fef2f2;
            color: #b91c1c;
          }

          .sharing-banner--success {
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            color: #15803d;
          }

          .sharing-loading {
            color: #94a3b8;
            font-size: 14px;
            padding: 24px 0;
            text-align: center;
          }

          .sharing-invite-form {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }

          .sharing-invite-input {
            flex: 1;
            min-width: 0;
            padding: 9px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            color: #1e293b;
            outline: none;
            transition: border-color 0.15s ease;
          }

          .sharing-invite-input:focus {
            border-color: #4f63d2;
            box-shadow: 0 0 0 3px rgba(79,99,210,0.1);
          }

          .sharing-section {
            margin-bottom: 18px;
          }

          .sharing-section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: #94a3b8;
            margin: 0 0 10px;
          }

          .sharing-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .sharing-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
          }

          .sharing-row-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 13px;
            color: #334155;
            min-width: 0;
          }

          .sharing-row-info strong {
            color: #1e293b;
            overflow-wrap: anywhere;
          }

          .sharing-row-info span {
            color: #94a3b8;
            font-size: 12px;
            overflow-wrap: anywhere;
          }

          .sharing-row-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .sharing-badge {
            padding: 4px 8px;
            border-radius: 999px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .sharing-empty {
            color: #94a3b8;
            font-size: 13px;
            margin: 0;
          }
        `}</style>
      </div>
    </div>
  );
}
