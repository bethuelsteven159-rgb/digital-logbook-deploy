import { describe, test, expect, beforeEach } from "vitest";
import {
  getQueue,
  getQueueForProject,
  addToQueue,
  removeFromQueue,
  updateQueueItem,
} from "./entryQueue";

beforeEach(() => {
  localStorage.clear();
});

describe("entryQueue", () => {
  test("getQueue returns an empty array when nothing is stored", () => {
    expect(getQueue()).toEqual([]);
  });

  test("addToQueue stores an item and returns it", () => {
    const item = addToQueue("project-1", { name: "Offline entry" });

    expect(item.projectId).toBe("project-1");
    expect(item.payload).toEqual({ name: "Offline entry" });
    expect(item.status).toBe("pending");
    expect(item.localId).toBeTruthy();

    expect(getQueue()).toHaveLength(1);
  });

  test("addToQueue assigns a unique localId per item", () => {
    const first = addToQueue("project-1", { name: "First" });
    const second = addToQueue("project-1", { name: "Second" });

    expect(first.localId).not.toBe(second.localId);
  });

  test("getQueueForProject only returns items for the given project", () => {
    addToQueue("project-1", { name: "In project 1" });
    addToQueue("project-2", { name: "In project 2" });

    const queue = getQueueForProject("project-1");

    expect(queue).toHaveLength(1);
    expect(queue[0].payload.name).toBe("In project 1");
  });

  test("removeFromQueue removes only the matching item", () => {
    const first = addToQueue("project-1", { name: "First" });
    addToQueue("project-1", { name: "Second" });

    removeFromQueue(first.localId);

    const queue = getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].payload.name).toBe("Second");
  });

  test("updateQueueItem merges changes into the matching item", () => {
    const item = addToQueue("project-1", { name: "First" });

    updateQueueItem(item.localId, {
      status: "failed",
      lastError: "Network error",
    });

    const queue = getQueue();

    expect(queue[0].status).toBe("failed");
    expect(queue[0].lastError).toBe("Network error");
    // Original fields should be preserved, not wiped out.
    expect(queue[0].payload).toEqual({ name: "First" });
  });

  test("updateQueueItem does nothing if the localId doesn't exist", () => {
    addToQueue("project-1", { name: "First" });

    updateQueueItem("nonexistent-id", { status: "failed" });

    const queue = getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("pending");
  });

  test("queue persists across separate calls (simulating page reload)", () => {
    addToQueue("project-1", { name: "Persisted entry" });

    // A fresh call to getQueue reads straight from localStorage again,
    // simulating what happens after a page reload.
    const queue = getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].payload.name).toBe("Persisted entry");
  });
});
