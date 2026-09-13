const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
  getOutstandingEntries,
  getIncompleteEntries,
  markEntryComplete,
} = require("../controllers/projectDetailsController");

const router = express.Router();

router.get("/:projectId", getProjectDetails);
router.post("/:projectId/entries", createProjectEntry);
router.get("/:projectId/entries/outstanding", getOutstandingEntries);
router.get("/:projectId/entries/incomplete", getIncompleteEntries);
router.patch("/:projectId/entries/:entryId/complete", markEntryComplete);

module.exports = router;
