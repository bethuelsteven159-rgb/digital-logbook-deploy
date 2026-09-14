const STORAGE_KEY = "offlineEntryQueue";

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// All entries queued, across every project.
export function getQueue() {
  return readQueue();
}

// Entries queued for one specific project (what the UI actually renders).
export function getQueueForProject(projectId) {
  return readQueue().filter((item) => item.projectId === projectId);
}

export function addToQueue(projectId, payload) {
  const queue = readQueue();

  const item = {
    localId: crypto.randomUUID(),
    projectId,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending", // "pending" | "syncing" | "failed"
    lastError: null,
  };

  queue.push(item);
  writeQueue(queue);

  return item;
}

export function removeFromQueue(localId) {
  writeQueue(readQueue().filter((item) => item.localId !== localId));
}

export function updateQueueItem(localId, changes) {
  const queue = readQueue();

  const next = queue.map((item) =>
    item.localId === localId ? { ...item, ...changes } : item,
  );

  writeQueue(next);
}
