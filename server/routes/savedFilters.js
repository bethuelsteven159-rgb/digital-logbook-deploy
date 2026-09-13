const express = require("express");

const {
  createSavedFilter,
  listSavedFilters,
  deleteSavedFilter,
  applySavedFilter,
} = require("../controllers/savedFilterController");

const router = express.Router();

router.post("/:projectId/filters", createSavedFilter);
router.get("/:projectId/filters", listSavedFilters);
router.get("/:projectId/filters/:filterId/apply", applySavedFilter);
router.delete("/filters/:filterId", deleteSavedFilter);

module.exports = router;
