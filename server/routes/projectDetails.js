const express = require("express");

const {
  getProjectDetails,
  createProjectEntry,
} = require("../controllers/projectDetailsController");

const router = express.Router();

router.get("/:projectId", getProjectDetails);
router.post("/:projectId/entries", createProjectEntry);

module.exports = router;
