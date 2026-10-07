import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../../hooks/useNotifications";
import {
  SEVERITY_COLORS,
  describeNotification,
  formatMinutes,
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

    if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
    }
  }

  return (
    <section
      aria-label="Notifications"
      style={{
        margin: "24px 0",
        padding: "24px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          <p
            style={{
              margin: "5px 0 0",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Everything that needs your attention
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {unreadCount > 0 && (
            <span
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#eef2ff",
                color: "#4f63d2",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {unreadCount} unread
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowUnreadOnly((current) => !current)}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: showUnreadOnly ? "#4f63d2" : "#fff",
              color: showUnreadOnly ? "#fff" : "#374151",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showUnreadOnly ? "Showing unread" : "Show unread only"}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh notifications"
            title="Refresh"
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            padding: "16px",
            borderRadius: "10px",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </p>
      )}

      {!error && loading && notifications.length === 0 && (
        <p
          style={{
            margin: 0,
            padding: "16px",
            borderRadius: "10px",
            background: "#f9fafb",
            color: "#6b7280",
          }}
        >
          Loading notifications...
        </p>
      )}

      {!error && !loading && counts && counts.overdue + counts.dueToday + counts.dueTomorrow > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          {counts.overdue > 0 && (
            <FeedPill color="#ef4444" label={`${counts.overdue} overdue`} />
          )}

          {counts.dueToday > 0 && (
            <FeedPill color="#f59e0b" label={`${counts.dueToday} due today`} />
          )}

          {counts.dueTomorrow > 0 && (
            <FeedPill color="#3b82f6" label={`${counts.dueTomorrow} due tomorrow`} />
          )}
        </div>
      )}

      {!error && visible.length === 0 && (
        <p
          style={{
            margin: 0,
            padding: "16px",
            borderRadius: "10px",
            background: "#f9fafb",
            color: "#6b7280",
          }}
        >
          {showUnreadOnly
            ? "No unread notifications."
            : "You're all caught up — nothing needs your attention."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {visible.map((notification) => {
          const color =
            SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.low;

          return (
            <div
              key={notification.key}
              style={{
                display: "flex",
                alignItems: "stretch",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                overflow: "hidden",
                background: notification.readAt ? "#fcfcfd" : "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => handleOpen(notification)}
                style={{
                  flex: 1,
                  display: "block",
                  padding: "14px 16px",
                  border: "none",
                  borderLeft: `4px solid ${color}`,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  opacity: notification.readAt ? 0.65 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: `${color}1a`,
                      color,
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {TYPE_LABELS[notification.type] || "Update"}
                  </span>

                  <strong style={{ fontSize: "14px", color: "#111827" }}>
                    {notification.title}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  {describeNotification(notification)}
                </div>

                {notification.type === "weekly_summary" &&
                  notification.projects > 0 && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#9ca3af",
                      }}
                    >
                      Across {notification.projects}{" "}
                      {notification.projects === 1 ? "project" : "projects"} ·{" "}
                      {formatMinutes(notification.minutes)} logged
                    </div>
                  )}
              </button>

              <button
                type="button"
                aria-label={`Dismiss ${notification.title}`}
                title="Dismiss"
                onClick={() => dismiss(notification.key)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  fontSize: "18px",
                  padding: "0 14px",
                  cursor: "pointer",
                }}
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

function FeedPill({ color, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 10px",
        borderRadius: "999px",
        background: "#f9fafb",
        border: `1px solid ${color}33`,
        fontSize: "12px",
        fontWeight: 600,
        color: "#374151",
      }}
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
