const {
  getProjectDetailsService,
  createEntryService,
  updateChecklistItemService,
  deleteChecklistItemService,
  updateProjectReferencesService,
  updateEntryProjectReferencesService,
  updateEntryReferencesService,
  updateEntryService,
} = require("../services/projectDetailsService");

const {
  createEntrySchema,
  updateChecklistSchema,
  updateProjectReferencesSchema,
  updateEntryReferencesSchema,
  updateEntryProjectReferencesSchema,
  updateEntrySchema,
} = require("../validation/entry.validation");

function requireUserId(req) {
  const userId =
    req.user?.id ||
    req.user?.sub;

  if (!userId) {
    const error = new Error(
      "Authentication required",
    );

    error.statusCode = 401;

    throw error;
  }

  return userId;
}

async function getProjectDetails(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await getProjectDetailsService({
        projectId:
          req.params.projectId,
        userId,
      });

    return res
      .status(200)
      .json({
        success: true,
        data,
      });
  } catch (error) {
    return next(error);
  }
}

async function createProjectEntry(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      createEntrySchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry data",
        errors:
          parsed.error.flatten(),
      });
    }

    const data =
      await createEntryService({
        projectId:
          req.params.projectId,
        userId,
        data: parsed.data,
      });

    return res
      .status(201)
      .json({
        success: true,
        data,
      });
  } catch (error) {
    return next(error);
  }
}

async function updateEntry(req, res, next) {
  try {
    const userId = requireUserId(req);
    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await updateEntryService({
      projectId: req.params.projectId,
      entryId: req.params.entryId,
      userId,
      data: parsed.data,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateChecklistItem(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      updateChecklistSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid checklist data",
        errors:
          parsed.error.flatten(),
      });
    }

    const data =
      await updateChecklistItemService({
        entryId:
          req.params.entryId,
        itemId:
          req.params.itemId,
        userId,
        changes:
          parsed.data,
      });

    return res
      .status(200)
      .json({
        success: true,
        data,
      });
  } catch (error) {
    return next(error);
  }
}

async function deleteChecklistItem(req, res, next) {
  try {
    const userId = requireUserId(req);
    const data = await deleteChecklistItemService({
      entryId: req.params.entryId,
      itemId: req.params.itemId,
      userId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateProjectReferences(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      updateProjectReferencesSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid project reference data",
        errors:
          parsed.error.flatten(),
      });
    }

    const data =
      await updateProjectReferencesService({
        projectId:
          req.params.projectId,
        userId,
        projectIds:
          parsed.data.projectIds,
      });

    return res
      .status(200)
      .json({
        success: true,
        data,
      });
  } catch (error) {
    return next(error);
  }
}

async function updateEntryProjectReferences(req, res, next) {
  try {
    const userId = requireUserId(req);
    const parsed = updateEntryProjectReferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry project reference data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await updateEntryProjectReferencesService({
      entryId: req.params.entryId,
      userId,
      projectIds: parsed.data.projectIds,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateEntryReferences(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      updateEntryReferencesSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid entry reference data",
        errors:
          parsed.error.flatten(),
      });
    }

    const data =
      await updateEntryReferencesService({
        entryId:
          req.params.entryId,
        userId,
        entryIds:
          parsed.data.entryIds,
      });

    return res
      .status(200)
      .json({
        success: true,
        data,
      });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProjectDetails,
  createProjectEntry,
  updateEntry,
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
};