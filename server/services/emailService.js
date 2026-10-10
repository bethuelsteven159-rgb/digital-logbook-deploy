const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_SENDER_NAME = "Digital Notebook";

function getEmailConfig(options = {}) {
  return {
    apiKey: options.apiKey ?? process.env.BREVO_API_KEY ?? "",
    fromEmail: options.fromEmail ?? process.env.EMAIL_FROM ?? "",
    fromName:
      options.fromName ?? process.env.EMAIL_FROM_NAME ?? DEFAULT_SENDER_NAME,
    timeoutMs:
      Number(options.timeoutMs ?? process.env.EMAIL_TIMEOUT_MS) ||
      DEFAULT_TIMEOUT_MS,
  };
}

function isEmailConfigured(options = {}) {
  const { apiKey, fromEmail } = getEmailConfig(options);
  return Boolean(apiKey && fromEmail);
}

async function sendEmail({ to, subject, text, html }, options = {}) {
  const config = getEmailConfig(options);

  if (!config.apiKey || !config.fromEmail) {
    const error = new Error("Email sending is not configured");
    error.statusCode = 503;
    throw error;
  }

  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: { email: config.fromEmail, name: config.fromName },
        to: [to.name ? { email: to.email, name: to.name } : { email: to.email }],
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      const error = new Error(
        `Email provider responded with ${response.status}${details ? `: ${details}` : ""}`,
      );
      error.statusCode = 502;
      throw error;
    }

    const payload = await response.json().catch(() => ({}));
    return { messageId: payload.messageId ?? null };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  BREVO_SEND_URL,
  isEmailConfigured,
  sendEmail,
};
