import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../hooks/useNotifications";
import {
  SEVERITY_COLORS,
  describeNotification,
} from "../utils/notificationFormat";

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * Notification bell for the sidebar. Shows the unread badge and opens
 * a dropdown with the live feed (same shared store as the dashboard
 * panel, so one poll serves both).
 */
export default function NotificationsBell({ collapsed = false }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead, dismiss } =
    useNotifications();
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  function handleItemClick(notification) {
    if (!notification.readAt) {
      markRead(notification.key);
    }

    close();

    if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
    }
  }

  return (
    <div className="notif-bell-wrap">
      <button
        type="button"
        className={`notif-bell ${unreadCount > 0 ? "notif-bell--active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        title={collapsed ? "Notifications" : undefined}
      >
        <span className="notif-bell-icon">
          <BellIcon />
        </span>

        {!collapsed && <span className="notif-bell-label">Notifications</span>}

        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={close} />

          <div className="notif-dropdown" role="dialog" aria-label="Notifications">
            <div className="notif-dropdown-header">
              <strong>Notifications</strong>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="notif-dropdown-list">
              {error && <div className="notif-empty">{error}</div>}

              {!error && notifications.length === 0 && (
                <div className="notif-empty">
                  {loading
                    ? "Loading notifications..."
                    : "You're all caught up."}
                </div>
              )}

              {notifications.map((notification) => {
                const color = SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.low;

                return (
                  <div
                    key={notification.key}
                    className={`notif-item ${notification.readAt ? "notif-item--read" : ""}`}
                  >
                    <button
                      type="button"
                      className="notif-item-main"
                      onClick={() => handleItemClick(notification)}
                      style={{ borderLeftColor: color }}
                    >
                      <span className="notif-item-title">
                        {!notification.readAt && (
                          <span
                            className="notif-unread-dot"
                            style={{ background: color }}
                          />
                        )}
                        {notification.title}
                      </span>

                      <span className="notif-item-body">
                        {describeNotification(notification)}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="notif-dismiss"
                      aria-label={`Dismiss ${notification.title}`}
                      title="Dismiss"
                      onClick={() => dismiss(notification.key)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        .notif-bell-wrap {
          position: relative;
          padding: 0 10px;
        }

        .notif-bell {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          overflow: visible;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .notif-bell:hover {
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.88);
        }

        .notif-bell:focus-visible {
          outline: 2px solid #8f9fef;
          outline-offset: 2px;
        }

        .notif-bell--active {
          color: #c3cdf6;
        }

        .notif-bell-icon {
          display: flex;
          align-items: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .sidebar--collapsed .notif-bell {
          justify-content: center;
          padding: 9px 0;
        }

        .sidebar--collapsed .notif-bell-wrap {
          padding: 0 10px;
        }

        .notif-bell-label {
          font-family: 'Inter', sans-serif;
        }

        .notif-badge {
          margin-left: auto;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
        }

        .notif-bell--active .notif-badge {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
        }

        .notif-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
        }

        .notif-dropdown {
          position: absolute;
          left: calc(100% + 14px);
          bottom: 0;
          width: min(380px, calc(100vw - 100px));
          max-height: min(480px, calc(100vh - 80px));
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
          z-index: 41;
          overflow: hidden;
        }

        .notif-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          color: #0f172a;
        }

        .notif-mark-all {
          border: none;
          background: transparent;
          color: #4f63d2;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .notif-mark-all:hover {
          text-decoration: underline;
        }

        .notif-dropdown-list {
          overflow-y: auto;
        }

        .notif-empty {
          padding: 22px 16px;
          color: #6b7280;
          font-size: 13px;
          text-align: center;
        }

        .notif-item {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid #f8fafc;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 12px 10px 12px 14px;
          border: none;
          border-left: 3px solid transparent;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .notif-item-main:hover {
          background: #f8fafc;
        }

        .notif-item--read .notif-item-main {
          opacity: 0.62;
        }

        .notif-item-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
        }

        .notif-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notif-item-body {
          color: #6b7280;
          font-size: 12px;
        }

        .notif-dismiss {
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 16px;
          padding: 0 10px;
          cursor: pointer;
        }

        .notif-dismiss:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
