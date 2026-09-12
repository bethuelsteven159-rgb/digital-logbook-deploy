export function getEntryDateKey(entry) {
  const raw = entry?.occurredAt || entry?.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupEntriesByDate(entries = []) {
  return entries.reduce((groups, entry) => {
    const key = getEntryDateKey(entry);
    if (!key) return groups;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {});
}

export function getFieldDisplayValue(entry, fieldId) {
  const value = (entry?.values || []).find((item) => item.fieldId === fieldId)?.value;
  if (value === null || value === undefined || value === "") return "Unassigned";
  return String(value);
}

export function groupEntriesByField(entries = [], fieldId) {
  return entries.reduce((groups, entry) => {
    const key = getFieldDisplayValue(entry, fieldId);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {});
}

export function getLinkedEntrySummaries(entry) {
  return Array.isArray(entry?.linkedEntries) ? entry.linkedEntries : [];
}
