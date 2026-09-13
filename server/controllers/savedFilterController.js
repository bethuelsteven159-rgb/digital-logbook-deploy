const {
  createSavedFilterService,
  listSavedFiltersService,
  deleteSavedFilterService,
  applySavedFilterService,
} = require("../services/savedFilterService");

const {
  createSavedFilterSchema,
} = require("../validation/savedFilter.validation");

function requireUserId(req) {
  const userId = req.user?.id;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
}

async function createSavedFilter(req, res, next) {
  try {
    const userId = requireUserId(req);

    const parsed = createSavedFilterSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid saved filter data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await createSavedFilterService({
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

async function listSavedFilters(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await listSavedFiltersService({
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

async function deleteSavedFilter(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await deleteSavedFilterService({
      ownerId: userId,
      filterId: req.params.filterId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function applySavedFilter(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await applySavedFilterService({
      ownerId: userId,
      filterId: req.params.filterId,
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

module.exports = {
  createSavedFilter,
  listSavedFilters,
  deleteSavedFilter,
  applySavedFilter,
};
