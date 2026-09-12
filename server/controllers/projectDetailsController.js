const {
  getProjectDetailsService,
  createEntryService,
  getOutstandingEntriesService,
} = require("../services/projectDetailsService");

const {
  createEntrySchema,
} = require("../validation/entry.validation");

function requireUserId(req) {
  const userId = req.user?.id;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
}

async function getProjectDetails(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await getProjectDetailsService({
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

async function createProjectEntry(req, res, next) {
  try {
    const userId = requireUserId(req);

    const parsed =
      createEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await createEntryService({
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

async function getOutstandingEntries(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await getOutstandingEntriesService({
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
  getProjectDetails,
  createProjectEntry,
  getOutstandingEntries
};
