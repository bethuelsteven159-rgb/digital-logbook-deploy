const express = require("express");

const {
  listRecurringEntries,
  createRecurringEntry,
  updateRecurringEntry,
  deleteRecurringEntry,
  generateDueRecurringEntries,
} = require("../controllers/recurringEntryController");

const router = express.Router();

router.post(
  "/:projectId/recurring-entries/generate-due",
  generateDueRecurringEntries,
);

router.get(
  "/:projectId/recurring-entries",
  listRecurringEntries,
);

router.post(
  "/:projectId/recurring-entries",
  createRecurringEntry,
);

router.patch(
  "/recurring-entries/:definitionId",
  updateRecurringEntry,
);

router.delete(
  "/recurring-entries/:definitionId",
  deleteRecurringEntry,
);

module.exports = router;
