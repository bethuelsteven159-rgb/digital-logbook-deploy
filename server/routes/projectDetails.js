const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
  getOutstandingEntries,
  completeProjectEntry,
  getIncompleteEntries,
  markEntryComplete,
  updateEntry,
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
} = require("../controllers/projectDetailsController");

const router = express.Router();

router.get(
  "/:projectId",
  getProjectDetails,
);

router.post(
  "/:projectId/entries",
  createProjectEntry,
);

router.get(
  "/:projectId/entries/outstanding",
  getOutstandingEntries,
);

router.get(
  "/:projectId/entries/incomplete",
  getIncompleteEntries,
);

router.patch(
  "/:projectId/entries/:entryId/complete",
  markEntryComplete,
);

router.patch(
  "/:projectId/references",
  updateProjectReferences,
);

router.patch(
  "/:projectId/entries/:entryId",
  updateEntry,
);

/*
 * Checklist item updates
 *
 * Used by the Entry Details modal when the user
 * checks or unchecks a checklist item.
 */
router.patch(
  "/:projectId/entries/:entryId/checklist/:itemId",
  updateChecklistItem,
);

router.delete(
  "/:projectId/entries/:entryId/checklist/:itemId",
  deleteChecklistItem,
);

router.patch(
  "/:projectId/entries/:entryId/project-references",
  updateEntryProjectReferences,
);

router.patch(
  "/:projectId/entries/:entryId/references",
  updateEntryReferences,
);

router.post(
  "/:projectId/entries/:entryId/complete",
  completeProjectEntry,
);

module.exports = router;
