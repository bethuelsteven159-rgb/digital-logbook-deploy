const {
  createAutomationRuleService,
  listAutomationRulesService,
  updateAutomationRuleService,
  deleteAutomationRuleService,
} = require("../services/automationRuleService");

const {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} = require("../validation/automationRule.validation");

function requireUserId(req) {
  const userId = req.user?.id;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
}

async function createAutomationRule(req, res, next) {
  try {
    const userId = requireUserId(req);

    const parsed = createAutomationRuleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid automation rule data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await createAutomationRuleService({
      ownerId: userId,
      projectId: req.params.projectId,
      data: parsed.data,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function listAutomationRules(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await listAutomationRulesService({
      ownerId: userId,
      projectId: req.params.projectId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAutomationRule(req, res, next) {
  try {
    const userId = requireUserId(req);

    const parsed = updateAutomationRuleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid automation rule data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await updateAutomationRuleService({
      ownerId: userId,
      ruleId: req.params.ruleId,
      data: parsed.data,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAutomationRule(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await deleteAutomationRuleService({
      ownerId: userId,
      ruleId: req.params.ruleId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAutomationRule,
  listAutomationRules,
  updateAutomationRule,
  deleteAutomationRule,
};
