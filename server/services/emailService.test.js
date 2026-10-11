import { describe, expect, test, vi } from "vitest";

const { BREVO_SEND_URL, isEmailConfigured, sendEmail } = require("./emailService");

const config = { apiKey: "test-key", fromEmail: "notebook@example.com", fromName: "Notebook" };

function okResponse(body = { messageId: "msg-1" }) {
  return { ok: true, status: 201, json: async () => body, text: async () => "" };
}

describe("isEmailConfigured", () => {
  test("requires both an API key and a sender address", () => {
    expect(isEmailConfigured(config)).toBe(true);
    expect(isEmailConfigured({ ...config, apiKey: "" })).toBe(false);
    expect(isEmailConfigured({ ...config, fromEmail: "" })).toBe(false);
  });
});

describe("sendEmail", () => {
  test("posts the message to the Brevo transactional email API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());

    const result = await sendEmail(
      {
        to: { email: "ana@example.com", name: "Ana" },
        subject: "Hello",
        text: "Plain body",
        html: "<p>Html body</p>",
      },
      { ...config, fetchImpl },
    );

    expect(result).toEqual({ messageId: "msg-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe(BREVO_SEND_URL);
    expect(request.method).toBe("POST");
    expect(request.headers["api-key"]).toBe("test-key");
    expect(JSON.parse(request.body)).toEqual({
      sender: { email: "notebook@example.com", name: "Notebook" },
      to: [{ email: "ana@example.com", name: "Ana" }],
      subject: "Hello",
      textContent: "Plain body",
      htmlContent: "<p>Html body</p>",
    });
  });

  test("omits the recipient name and html when they are not provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({}));

    const result = await sendEmail(
      { to: { email: "ana@example.com" }, subject: "Hi", text: "Body" },
      { ...config, fetchImpl },
    );

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.to).toEqual([{ email: "ana@example.com" }]);
    expect(body).not.toHaveProperty("htmlContent");
    expect(result).toEqual({ messageId: null });
  });

  test("rejects when email is not configured without calling the provider", async () => {
    const fetchImpl = vi.fn();

    await expect(
      sendEmail(
        { to: { email: "ana@example.com" }, subject: "Hi", text: "Body" },
        { apiKey: "", fromEmail: "", fetchImpl },
      ),
    ).rejects.toMatchObject({ statusCode: 503 });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects with the provider status when Brevo returns an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });

    await expect(
      sendEmail(
        { to: { email: "ana@example.com" }, subject: "Hi", text: "Body" },
        { ...config, fetchImpl },
      ),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Email provider responded with 401: unauthorized",
    });
  });
});
