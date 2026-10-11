import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../../hooks/useNotifications";
import {
  SEVERITY_COLORS,
  describeNotification,
  formatMinutes,
  getNotificationTarget,
} from "../../utils/notificationFormat";

const TYPE_LABELS = {
  entry_overdue: "Overdue",
  entry_due_today: "Due today",
  entry_due_tomorrow: "Due tomorrow",
  entry_checklist: "Checklist",
  recurring_pending: "Recurring",
  recurring_ending: "Recurring",
  project_stale: "Projects",
  weekly_summary: "Progress",
};

/**
 * Full notification feed for the Dashboard. Replaces the old reminders
 * panel: due entries, checklists, recurring series, quiet projects and
 * the weekly digest, each with mark-read and dismiss actions.
 */
export default function NotificationsPanel() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    counts,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const visible = showUnreadOnly
    ? notifications.filter((n) => !n.readAt)
    : notifications;

  function handleOpen(notification) {
    if (!notification.readAt) {
      markRead(notification.key);
    }

    const target = getNotificationTarget(notification);

    if (target) {
      navigate(target);
    }
  }

  return (
    <section aria-label="Notifications" className="notifications-panel">
      <div className="notifications-panel__header">
        <div>
          <h2 className="notifications-panel__title">Notifications</h2>
          <p className="notifications-panel__subtitle">
            Everything that needs your attention
          </p>
        </div>

        <div className="notifications-panel__actions">
          {unreadCount > 0 && (
            <span className="notifications-panel__badge">
              {unreadCount} unread
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowUnreadOnly((current) => !current)}
            className={`notifications-panel__btn${
              showUnreadOnly ? " notifications-panel__btn--active" : ""
            }`}
          >
            {showUnreadOnly ? "Showing unread" : "Show unread only"}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="notifications-panel__btn"
            >
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh notifications"
            title="Refresh"
            className="notifications-panel__btn"
          >
            ↻
          </button>
        </div>
      </div>

      {error && <p className="notifications-panel__error">{error}</p>}

      {!error && loading && notifications.length === 0 && (
        <p className="notifications-panel__placeholder">
          Loading notifications...
        </p>
      )}

      {!error &&
        !loading &&
        counts &&
        counts.overdue + counts.dueToday + counts.dueTomorrow > 0 && (
          <div className="notifications-panel__pills">
            {counts.overdue > 0 && (
              <FeedPill
                className="notifications-panel__pill"
                color="#ef4444"
                label={`${counts.overdue} overdue`}
              />
            )}

            {counts.dueToday > 0 && (
              <FeedPill
                className="notifications-panel__pill"
                color="#f59e0b"
                label={`${counts.dueToday} due today`}
              />
            )}

            {counts.dueTomorrow > 0 && (
              <FeedPill
                className="notifications-panel__pill"
                color="#3b82f6"
                label={`${counts.dueTomorrow} due tomorrow`}
              />
            )}
          </div>
        )}

      {!error && visible.length === 0 && (
        <p className="notifications-panel__placeholder">
          {showUnreadOnly
            ? "No unread notifications."
            : "You're all caught up — nothing needs your attention."}
        </p>
      )}

      <div className="notifications-panel__list">
        {visible.map((notification) => {
          const color =
            SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.low;
          const target = getNotificationTarget(notification);
          const read = Boolean(notification.readAt);

          const content = (
            <>
              <div className="notifications-panel__head">
                <span
                  className="notifications-panel__type"
                  style={{ background: `${color}1a`, color }}
                >
                  {TYPE_LABELS[notification.type] || "Update"}
                </span>

                <strong className="notifications-panel__heading">
                  {notification.title}
                </strong>
              </div>

              <div className="notifications-panel__description">
                {describeNotification(notification)}
              </div>

              {notification.type === "weekly_summary" &&
                notification.projects > 0 && (
                  <div className="notifications-panel__meta">
                    Across {notification.projects}{" "}
                    {notification.projects === 1 ? "project" : "projects"} ·{" "}
                    {formatMinutes(notification.minutes)} logged
                  </div>
                )}
            </>
          );

          return (
            <div
              key={notification.key}
              className={`notifications-panel__card${
                read ? " notifications-panel__card--read" : ""
              }`}
            >
              {/* Items without a destination stay static so they do not look navigable. */}
              {target ? (
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className="notifications-panel__main"
                  style={{
                    borderLeft: `4px solid ${color}`,
                    opacity: read ? 0.65 : 1,
                  }}
                >
                  {content}
                </button>
              ) : (
                <div
                  className="notifications-panel__main"
                  style={{
                    borderLeft: `4px solid ${color}`,
                    opacity: read ? 0.65 : 1,
                    cursor: "default",
                  }}
                >
                  {content}
                </div>
              )}

              <button
                type="button"
                aria-label={`Dismiss ${notification.title}`}
                title="Dismiss"
                onClick={() => dismiss(notification.key)}
                className="notifications-panel__dismiss"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeedPill({ className = "", color, label }) {
  return (
    <span
      className={className}
      style={{ border: `1px solid ${color}33` }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
        }}
      />
      {label}
    </span>
  );
}
