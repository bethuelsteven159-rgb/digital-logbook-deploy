function isOverdue(entry, now = new Date()) {
  if (!entry.dueAt) {
    return false;
  }

  if (entry.completedAt) {
    return false;
  }

  return new Date(entry.dueAt) < now;
}

module.exports = {
  isOverdue,
};
