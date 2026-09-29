const express = require("express");

const {
  getProjectDetails,
  getAiProjectProgress,
  getAiProjectSpeech,
  searchProjectEntries,
  createProjectEntry,
  getOutstandingEntries,
  completeProjectEntry,
  getIncompleteEntries,
  markEntryComplete,
  updateEntry,
  deleteEntry,
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
  getEntryRevisions,
  getEntryRevision,
  restoreEntryRevision,
} = require(
  "../controllers/projectDetailsController",
);

const router = express.Router();

router.get(
  "/:projectId",
  getProjectDetails,
);

router.post(
  "/:projectId/ai-progress",
  getAiProjectProgress,
);

router.post(
  "/:projectId/ai-progress/speech",
  getAiProjectSpeech,
);

router.get(
  "/:projectId/entries/search",
  searchProjectEntries,
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

router.delete(
  "/:projectId/entries/:entryId",
  deleteEntry,
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

router.post(
  "/:projectId/entries/:entryId/complete",
  completeProjectEntry,
);

router.get(
  "/:projectId/entries/:entryId/revisions",
  getEntryRevisions,
);

router.get(
  "/:projectId/entries/:entryId/revisions/:revisionId",
  getEntryRevision,
);

router.post(
  "/:projectId/entries/:entryId/revisions/:revisionId/restore",
  restoreEntryRevision,
);

module.exports = router;