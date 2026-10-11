export const SEVERITY_COLORS = {
  high: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  low: "#64748b",
};

export function formatMinutes(minutes) {
  const value = Math.max(0, Number(minutes) || 0);

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (hours === 0) {
    return `${remaining}m`;
  }

  if (remaining === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
}

export function formatDueDate(date) {
  if (!date) {
    return "";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(date) {
  if (!date) {
    return "";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

/**
 * One-line detail for a notification, tailored per type.
 */
export function describeNotification(notification) {
  switch (notification.type) {
    case "weekly_summary": {
      const parts = [
        `${formatMinutes(notification.minutes)} across ${notification.entries} ${notification.entries === 1 ? "entry" : "entries"}`,
      ];

      if (notification.completed > 0) {
        parts.push(`${notification.completed} completed`);
      }

      return parts.join(" · ");
    }

    case "recurring_pending":
    case "recurring_ending":
      return notification.body || "";

    case "project_stale":
      return notification.body || "";

    default:
      return [
        notification.projectName,
        notification.dueAt ? `Due ${formatDueDate(notification.dueAt)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
  }
}
