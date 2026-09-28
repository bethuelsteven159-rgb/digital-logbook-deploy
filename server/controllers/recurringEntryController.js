const {
  listRecurringEntriesService,
  createRecurringEntryService,
  updateRecurringEntryService,
  deleteRecurringEntryService,
  generateDueRecurringEntriesService,
} = require("../services/recurringEntryService");
const {
  createRecurringEntrySchema,
  updateRecurringEntrySchema,
} = require("../validation/recurringEntry.validation");

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

async function listRecurringEntries(
  req,
  res,
  next,
) {
  try {
    const userId = requireUserId(req);

    const data =
      await listRecurringEntriesService({
        projectId: req.params.projectId,
        userId,
      });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createRecurringEntry(
  req,
  res,
  next,
) {
  try {
    const userId = requireUserId(req);

    const parsed =
      createRecurringEntrySchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring entry data",
        errors: parsed.error.flatten(),
      });
    }

    const data =
      await createRecurringEntryService({
        projectId: req.params.projectId,
        userId,
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

async function updateRecurringEntry(
  req,
  res,
  next,
) {
  try {
    const userId = requireUserId(req);

    const parsed =
      updateRecurringEntrySchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring entry data",
        errors: parsed.error.flatten(),
      });
    }

    const data =
      await updateRecurringEntryService({
        definitionId:
          req.params.definitionId,
        userId,
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

async function deleteRecurringEntry(
  req,
  res,
  next,
) {
  try {
    const userId = requireUserId(req);

    const data =
      await deleteRecurringEntryService({
        definitionId:
          req.params.definitionId,
        userId,
      });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function generateDueRecurringEntries(
  req,
  res,
  next,
) {
  try {
    const userId = requireUserId(req);

    const data =
      await generateDueRecurringEntriesService({
        projectId: req.params.projectId,
        userId,
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
  listRecurringEntries,
  createRecurringEntry,
  updateRecurringEntry,
  deleteRecurringEntry,
  generateDueRecurringEntries,
};
