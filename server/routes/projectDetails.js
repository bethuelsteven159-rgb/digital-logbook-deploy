const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
  getOutstandingEntries,
} = require("../controllers/projectDetailsController");

const router = express.Router();

router.get("/:projectId", getProjectDetails);
router.post("/:projectId/entries", createProjectEntry);
router.get("/:projectId/entries/outstanding", getOutstandingEntries);

module.exports = router;
