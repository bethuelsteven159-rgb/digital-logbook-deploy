const db = require("../db");
const emailService = require("./emailService");

const DEFAULT_THROTTLE_MS = 10 * 60 * 1000;

const ACTION_DESCRIPTIONS = {
  entry_created: (entryName) => `added the entry "${entryName}"`,
  entry_updated: (entryName) => `edited the entry "${entryName}"`,
  entry_deleted: (entryName) => `deleted the entry "${entryName}"`,
  entry_archived: (entryName) => `archived the entry "${entryName}"`,
  entry_unarchived: (entryName) => `restored the archived entry "${entryName}"`,
  entry_completed: (entryName) => `marked the entry "${entryName}" as complete`,
  entry_revision_restored: (entryName) =>
    `restored an earlier version of the entry "${entryName}"`,
  project_updated: () => "updated the project details",
  project_archived: () => "archived the project",
  project_unarchived: () => "unarchived the project",
};

const lastSentAt = new Map();

// Test runners load server/.env through db.js, so a developer's real Brevo key
// must not cause test runs to send email.
function isTestRun() {
  return Boolean(
    process.env.NODE_ENV === "test" ||
      process.env.VITEST ||
      process.env.NODE_TEST_CONTEXT,
  );
}

function getThrottleMs(options) {
  const value = Number(
    options.throttleMs ?? process.env.COLLABORATOR_EMAIL_THROTTLE_MS,
  );
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_THROTTLE_MS;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadProjectMembers(projectId, query) {
  const result = await query(
    `
      SELECT p.name AS project_name, u.id, u.name, u.email
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
      UNION ALL
      SELECT p.name AS project_name, u.id, u.name, u.email
      FROM project_collaborators pc
      JOIN projects p ON p.id = pc.project_id
      JOIN users u ON u.id = pc.user_id
      WHERE pc.project_id = $1
    `,
    [projectId],
  );

  return result.rows;
}

function buildProjectUrl(projectId) {
  const base = String(process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  return base ? `${base}/projects/${projectId}` : null;
}

function buildEmail({ recipient, actorName, projectName, description, projectUrl, throttleMs }) {
  const subject = `${actorName} ${description} in "${projectName}"`;
  const throttleMinutes = Math.round(throttleMs / 60000);
  const throttleNote =
    throttleMinutes > 0
      ? `To avoid flooding your inbox, other changes made to this project in the next ${throttleMinutes} minute${throttleMinutes === 1 ? "" : "s"} will not be emailed.`
      : "";
  const greeting = `Hi ${recipient.name || "there"},`;
  const summary = `${actorName} ${description} in the shared project "${projectName}".`;

  const text = [
    greeting,
    "",
    summary,
    ...(projectUrl ? ["", `Open the project: ${projectUrl}`] : []),
    ...(throttleNote ? ["", throttleNote] : []),
    "",
    "You are receiving this because you are a member of this shared project.",
  ].join("\n");

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(summary)}</p>`,
    projectUrl
      ? `<p><a href="${escapeHtml(projectUrl)}">Open the project</a></p>`
      : "",
    throttleNote ? `<p style="color:#666">${escapeHtml(throttleNote)}</p>` : "",
    `<p style="color:#666">You are receiving this because you are a member of this shared project.</p>`,
  ].join("");

  return { subject, text, html };
}

async function notifyProjectChange(
  { projectId, actorId, action, entryName },
  options = {},
) {
  try {
    const enabled =
      options.enabled ?? (!isTestRun() && emailService.isEmailConfigured());

    const describe = ACTION_DESCRIPTIONS[action];

    if (!enabled || !describe || !projectId || !actorId) {
      return { sent: 0 };
    }

    const query = options.query || ((text, params) => db.query(text, params));
    const send = options.sendEmail || emailService.sendEmail;
    const now = options.now || Date.now;
    const throttleMs = getThrottleMs(options);

    const members = await loadProjectMembers(projectId, query);
    const actor = members.find((member) => member.id === actorId);

    if (!actor) {
      return { sent: 0 };
    }

    const seen = new Set([actorId]);
    const recipients = members.filter((member) => {
      if (seen.has(member.id) || !member.email) return false;
      seen.add(member.id);
      return true;
    });

    const description = describe(entryName || "an entry");
    const projectName = members[0]?.project_name || "a shared project";
    const projectUrl = buildProjectUrl(projectId);
    const actorName = actor.name || actor.email || "A collaborator";

    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const key = `${projectId}:${recipient.id}`;
        const previous = lastSentAt.get(key);
        const timestamp = now();

        if (previous !== undefined && timestamp - previous < throttleMs) {
          return false;
        }

        lastSentAt.set(key, timestamp);

        try {
          await send({
            to: { email: recipient.email, name: recipient.name },
            ...buildEmail({
              recipient,
              actorName,
              projectName,
              description,
              projectUrl,
              throttleMs,
            }),
          });
          return true;
        } catch (error) {
          if (lastSentAt.get(key) === timestamp) lastSentAt.delete(key);
          throw error;
        }
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          "Failed to send collaborator notification email:",
          result.reason?.message || result.reason,
        );
      }
    }

    return {
      sent: results.filter((r) => r.status === "fulfilled" && r.value).length,
    };
  } catch (error) {
    console.error(
      "Failed to prepare collaborator notification emails:",
      error?.message || error,
    );
    return { sent: 0 };
  }
}

function resetNotificationThrottle() {
  lastSentAt.clear();
}

module.exports = {
  ACTION_DESCRIPTIONS,
  notifyProjectChange,
  resetNotificationThrottle,
};
