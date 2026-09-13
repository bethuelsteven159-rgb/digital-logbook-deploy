import { describe, it, expect } from "vitest";
import { isOverdue } from "./dueDateService.js";

describe("isOverdue", () => {
  const now = new Date("2026-09-12T00:00:00.000Z");

  it("returns true when due date is in the past and entry is not completed", () => {
    const entry = {
      dueAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    };

    expect(isOverdue(entry, now)).toBe(true);
  });

  it("returns false when due date is in the future", () => {
    const entry = {
      dueAt: "2026-12-01T00:00:00.000Z",
      completedAt: null,
    };

    expect(isOverdue(entry, now)).toBe(false);
  });

  it("returns false when there is no due date", () => {
    const entry = {
      dueAt: null,
      completedAt: null,
    };

    expect(isOverdue(entry, now)).toBe(false);
  });

  it("returns false when the entry is already completed, even if overdue", () => {
    const entry = {
      dueAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
    };

    expect(isOverdue(entry, now)).toBe(false);
  });

  it("returns false when due date is exactly now", () => {
    const entry = {
      dueAt: now.toISOString(),
      completedAt: null,
    };

    expect(isOverdue(entry, now)).toBe(false);
  });
});
