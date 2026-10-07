import { useCallback, useEffect, useState } from "react";

import {
  dismissNotification as dismissNotificationRequest,
  fetchNotifications,
  markAllNotificationsRead as markAllNotificationsReadRequest,
  markNotificationRead as markNotificationReadRequest,
} from "../api/notificationsApi";

// How often the feed refreshes while at least one component is mounted.
const POLL_INTERVAL_MS = 60000;

/* ------------------------------------------------------------------ *
 * Shared store: several components (sidebar bell, dashboard panel)
 * can use notifications at once, so the feed, its polling timer and
 * in-flight requests live in module scope and fans out to subscribers.
 * ------------------------------------------------------------------ */

const EMPTY_FEED = {
  notifications: [],
  unreadCount: 0,
  counts: { overdue: 0, dueToday: 0, dueTomorrow: 0 },
  generatedAt: null,
};

let feed = EMPTY_FEED;
let loading = false;
let error = "";
let pollTimer = null;
let inFlight = null;
const listeners = new Set();

function snapshot() {
  return {
    ...feed,
    counts: feed.counts ? { ...feed.counts } : { ...EMPTY_FEED.counts },
    loading,
    error,
  };
}

function emit() {
  const next = snapshot();

  for (const listener of listeners) {
    listener(next);
  }
}

function hasAuthToken() {
  return Boolean(localStorage.getItem("authToken"));
}

async function loadFeed() {
  if (!hasAuthToken()) {
    return;
  }

  // Deduplicate concurrent refreshes behind one in-flight promise.
  if (inFlight) {
    return inFlight;
  }

  loading = true;
  emit();

  inFlight = fetchNotifications()
    .then((result) => {
      feed = {
        notifications: Array.isArray(result?.notifications)
          ? result.notifications
          : [],
        unreadCount: Number(result?.unreadCount) || 0,
        counts: result?.counts || { ...EMPTY_FEED.counts },
        generatedAt: result?.generatedAt || null,
      };
      error = "";
    })
    .catch((requestError) => {
      // A 401 simply means there is no session yet; keep the last feed.
      if (requestError?.status !== 401) {
        error =
          requestError?.message || "Could not load notifications.";
      }
    })
    .finally(() => {
      inFlight = null;
      loading = false;
      emit();
    });

  return inFlight;
}

function startPolling() {
  if (pollTimer) {
    return;
  }

  pollTimer = setInterval(() => {
    loadFeed();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function setFeed(updater) {
  feed = updater(feed);
  emit();
}

/** Test-only: wipe the shared store between tests. */
export function __resetNotificationsStore() {
  stopPolling();
  inFlight = null;
  feed = EMPTY_FEED;
  loading = false;
  error = "";
}

/**
 * Shared notifications state.
 *
 * Returns the feed plus refresh/mark-read/dismiss actions. While any
 * consumer is mounted the feed refreshes automatically every minute.
 */
export function useNotifications() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    listeners.add(setState);

    loadFeed();
    startPolling();

    return () => {
      listeners.delete(setState);

      if (listeners.size === 0) {
        stopPolling();
      }
    };
  }, []);

  const refresh = useCallback(() => loadFeed(), []);

  const markRead = useCallback(async (key) => {
    if (!key) {
      return;
    }

    // Optimistic: the badge should drop instantly, then confirm.
    let hadRead = false;

    setFeed((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => {
        if (notification.key !== key) {
          return notification;
        }

        hadRead = !notification.readAt;

        return { ...notification, readAt: notification.readAt || new Date().toISOString() };
      }),
      unreadCount: current.unreadCount,
    }));

    if (hadRead) {
      setFeed((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
      }));
    }

    try {
      await markNotificationReadRequest(key);
    } catch {
      // Resync with the server when the write failed.
      loadFeed();
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const previousUnread = feed.unreadCount;

    setFeed((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));

    try {
      await markAllNotificationsReadRequest();
    } catch {
      setFeed((current) => ({ ...current, unreadCount: previousUnread }));
      loadFeed();
    }
  }, []);

  const dismiss = useCallback(async (key) => {
    if (!key) {
      return;
    }

    const removed = feed.notifications.find(
      (notification) => notification.key === key,
    );

    setFeed((current) => ({
      ...current,
      notifications: current.notifications.filter(
        (notification) => notification.key !== key,
      ),
      unreadCount:
        removed && !removed.readAt
          ? Math.max(0, current.unreadCount - 1)
          : current.unreadCount,
    }));

    try {
      await dismissNotificationRequest(key);
    } catch {
      loadFeed();
    }
  }, []);

  return { ...state, refresh, markRead, markAllRead, dismiss };
}
