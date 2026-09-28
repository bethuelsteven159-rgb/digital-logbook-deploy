const express = require("express");

const {
  createAutomationRule,
  listAutomationRules,
  updateAutomationRule,
  deleteAutomationRule,
} = require("../controllers/automationRuleController");

const router = express.Router();

router.post("/:projectId/automation-rules", createAutomationRule);
router.get("/:projectId/automation-rules", listAutomationRules);
router.patch("/automation-rules/:ruleId", updateAutomationRule);
router.delete("/automation-rules/:ruleId", deleteAutomationRule);

module.exports = router;
