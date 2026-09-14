const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
  getOutstandingEntries,
  completeProjectEntry,
} = require("../controllers/projectDetailsController");

const router = express.Router();

router.get("/:projectId", getProjectDetails);
router.post("/:projectId/entries", createProjectEntry);
router.get("/:projectId/entries/outstanding", getOutstandingEntries);

router.post(
  "/:projectId/entries/:entryId/complete",
  completeProjectEntry,
);

module.exports = router;
