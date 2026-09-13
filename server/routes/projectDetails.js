const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
  updateEntry,
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
  getOutstandingEntries,
} = require("../controllers/projectDetailsController");

const router =
  express.Router();

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

router.patch(
  "/:projectId/references",
  updateProjectReferences,
);

router.patch(
  "/:projectId/entries/:entryId",
  updateEntry,
);

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

module.exports = router;