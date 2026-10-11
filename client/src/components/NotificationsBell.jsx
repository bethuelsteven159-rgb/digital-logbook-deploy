import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../hooks/useNotifications";
import {
  SEVERITY_COLORS,
  describeNotification,
  getNotificationTarget,
} from "../utils/notificationFormat";

const DROPDOWN_GAP = 14;
const DROPDOWN_WIDTH = 380;
const MAX_DROPDOWN_HEIGHT = 480;
const VIEWPORT_MARGIN = 8;
// Below this much free space the dropdown flips below the bell instead of
// squeezing above it.
const MIN_SPACE_ABOVE = 240;

// The sidebar is a scroll container (overflow-y: auto), so a dropdown
// positioned inside it gets clipped. Rendering it through a portal with
// fixed positioning keeps it anchored to the bell without being clipped.
function computeDropdownPosition(bellWrap) {
  const rect = bellWrap?.getBoundingClientRect();

  if (!rect) {
    return null;
  }

  const width = Math.min(DROPDOWN_WIDTH, window.innerWidth - 100);
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(
      rect.right + DROPDOWN_GAP,
      window.innerWidth - width - VIEWPORT_MARGIN,
    ),
  );
  const spaceAbove = rect.bottom - VIEWPORT_MARGIN * 2;
  const spaceBelow = Math.max(
    0,
    window.innerHeight - rect.bottom - VIEWPORT_MARGIN * 2,
  );

  // Grow upward from the bell when there is room; otherwise hang below it
  // so the panel stays inside the viewport.
  if (spaceAbove >= MIN_SPACE_ABOVE) {
    return {
      left,
      bottom: Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.bottom),
      maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, spaceAbove),
    };
  }

  return {
    left,
    top: Math.max(VIEWPORT_MARGIN, rect.bottom + VIEWPORT_MARGIN),
    maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, spaceBelow),
  };
}

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
  const [position, setPosition] = useState(null);
  const bellWrapRef = useRef(null);
  const bellButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const autoFocusOnOpenRef = useRef(false);

  function close() {
    setOpen(false);
  }

  function toggleOpen(openedFromKeyboard = false) {
    if (open) {
      close();
      return;
    }

    autoFocusOnOpenRef.current = openedFromKeyboard;
    setPosition(computeDropdownPosition(bellWrapRef.current));
    setOpen(true);
  }

  // Keep the dropdown pinned to the bell while the window, the page or
  // the scrollable sidebar moves, and after the sidebar collapses.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function reposition() {
      setPosition(computeDropdownPosition(bellWrapRef.current));
    }

    reposition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, collapsed]);

  // Keyboard support: focus the dialog when it opens from the keyboard
  // and let Escape close it, returning focus to the bell.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    if (autoFocusOnOpenRef.current) {
      autoFocusOnOpenRef.current = false;
      (dropdownRef.current?.querySelector("button") || dropdownRef.current)?.focus();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        bellButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleDropdownKeyDown(event) {
    if (event.key !== "Tab" || !dropdownRef.current) {
      return;
    }

    const focusables = Array.from(dropdownRef.current.querySelectorAll("button"));

    if (focusables.length === 0) {
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dropdownRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleItemClick(notification) {
    if (!notification.readAt) {
      markRead(notification.key);
    }

    close();

    const target = getNotificationTarget(notification);

    if (target) {
      navigate(target);
    }
  }

  return (
    <div className="notif-bell-wrap" ref={bellWrapRef}>
      <button
        type="button"
        ref={bellButtonRef}
        className={`notif-bell ${unreadCount > 0 ? "notif-bell--active" : ""}`}
        onClick={(event) => toggleOpen(event.detail === 0)}
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

      {open &&
        createPortal(
          <>
            <div className="notif-backdrop" onClick={close} />

            <div
              className="notif-dropdown"
              role="dialog"
              aria-label="Notifications"
              ref={dropdownRef}
              tabIndex={-1}
              style={position || undefined}
              onKeyDown={handleDropdownKeyDown}
            >
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
                  const target = getNotificationTarget(notification);

                  const content = (
                    <>
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
                    </>
                  );

                  return (
                    <div
                      key={notification.key}
                      className={`notif-item ${notification.readAt ? "notif-item--read" : ""}`}
                    >
                      {target ? (
                        <button
                          type="button"
                          className="notif-item-main"
                          onClick={() => handleItemClick(notification)}
                          style={{ borderLeftColor: color }}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          className="notif-item-main notif-item-main--static"
                          style={{ borderLeftColor: color }}
                        >
                          {content}
                        </div>
                      )}

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
          </>,
          document.body,
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
          position: fixed;
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
          font-family: inherit;
          cursor: pointer;
        }

        .notif-item-main:hover {
          background: #f8fafc;
        }

        .notif-item--read .notif-item-main {
          opacity: 0.62;
        }

        .notif-item-main--static {
          cursor: default;
        }

        .notif-item-main--static:hover {
          background: transparent;
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
