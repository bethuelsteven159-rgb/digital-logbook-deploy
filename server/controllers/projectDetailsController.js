const {
  getProjectDetailsService,
  searchProjectEntriesService,
  searchOwnedEntriesService,
  createEntryService,
  updateChecklistItemService,
  deleteChecklistItemService,
  updateProjectReferencesService,
  updateEntryProjectReferencesService,
  updateEntryReferencesService,
  updateEntryService,
  archiveEntryService,
  unarchiveEntryService,
  deleteEntryService,
  getEntryRevisionsService,
  getEntryRevisionService,
  restoreEntryRevisionService,
  getOutstandingEntriesService,
  completeEntryService,
  getIncompleteEntriesService,
  markEntryCompleteService,
} = require(
  "../services/projectDetailsService",
);

const {
  generateProjectProgressInsight,
} = require(
  "../services/aiProjectProgressService",
);

const {
  searchLearningVideos,
} = require("../services/youtubeSearchService");

const {
  generateInsightSpeech,
} = require(
  "../services/aiProjectTtsService",
);

const {
  createEntrySchema,
  updateChecklistSchema,
  updateProjectReferencesSchema,
  updateEntryReferencesSchema,
  updateEntryProjectReferencesSchema,
  updateEntrySchema,
} = require(
  "../validation/entry.validation",
);

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

async function getAiProjectProgress(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const projectDetails =
      await getProjectDetailsService({
        projectId:
          req.params.projectId,

        userId,
      });

    const data =
      await generateProjectProgressInsight(
        projectDetails,
      );

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

async function getLearningVideos(req, res, next) {
  try {
    const userId = requireUserId(req);

    // Confirms the project exists and belongs to this user.
    const projectDetails = await getProjectDetailsService({
      projectId: req.params.projectId,
      userId,
    });

    const query =
      req.query?.q || projectDetails?.project?.name || "";

    const data = await searchLearningVideos(query);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
async function getAiProjectSpeech(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    await getProjectDetailsService({
      projectId:
        req.params.projectId,

      userId,
    });

    const insight =
      req.body?.insight;

    if (
      !insight ||
      typeof insight !== "object"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "AI insight is required.",
        });
    }

    const data =
      await generateInsightSpeech(
        insight,
      );

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

async function searchProjectEntries(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    let customFields = [];

    if (req.query.customFields) {
      try {
        const parsed =
          JSON.parse(
            req.query.customFields,
          );

        if (
          !Array.isArray(parsed)
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "customFields must be an array",
            });
        }

        customFields = parsed;
      } catch {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "customFields must be valid JSON",
          });
      }
    }

    const data =
      await searchProjectEntriesService({
        projectId:
          req.params.projectId,

        userId,

        filters: {
          query:
            req.query.q,

          fromDate:
            req.query.fromDate,

          toDate:
            req.query.toDate,

          minDuration:
            req.query.minDuration,

          maxDuration:
            req.query.maxDuration,

          completed:
            req.query.completed,

          sort:
            req.query.sort,
          archived:
            req.query.archived === "true",

          customFields,
        },
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

async function searchOwnedEntries(req, res, next) {
  try {
    const userId = requireUserId(req);
    let customFields = [];

    if (req.query.customFields) {
      try {
        const parsed = JSON.parse(req.query.customFields);
        if (!Array.isArray(parsed)) {
          return res.status(400).json({ success: false, message: "customFields must be an array" });
        }
        customFields = parsed;
      } catch {
        return res.status(400).json({ success: false, message: "customFields must be valid JSON" });
      }
    }

    const data = await searchOwnedEntriesService({
      userId,
      filters: {
        projectId: req.query.projectId,
        query: req.query.q,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        minDuration: req.query.minDuration,
        maxDuration: req.query.maxDuration,
        completed: req.query.completed,
        sort: req.query.sort,
        archived: req.query.archived === "true",
        customFields,
      },
    });

    return res.status(200).json({ success: true, data });
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
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid entry data",

          errors:
            parsed.error.flatten(),
        });
    }

    const data =
      await createEntryService({
        projectId:
          req.params.projectId,

        userId,

        data:
          parsed.data,
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

async function updateEntry(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      updateEntrySchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid entry data",

          errors:
            parsed.error.flatten(),
        });
    }

    const data =
      await updateEntryService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

        userId,

        data:
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
async function archiveEntry(req, res, next) {
  try {
    const data = await archiveEntryService({
      projectId: req.params.projectId,
      entryId: req.params.entryId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}
async function unarchiveEntry(req, res, next) {
  try {
    const data = await unarchiveEntryService({
      projectId: req.params.projectId,
      entryId: req.params.entryId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteEntry(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await deleteEntryService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

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
      return res
        .status(400)
        .json({
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

async function deleteChecklistItem(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await deleteChecklistItemService({
        entryId:
          req.params.entryId,

        itemId:
          req.params.itemId,

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
      return res
        .status(400)
        .json({
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

async function updateEntryProjectReferences(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const parsed =
      updateEntryProjectReferencesSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid entry project reference data",

          errors:
            parsed.error.flatten(),
        });
    }

    const data =
      await updateEntryProjectReferencesService({
        entryId:
          req.params.entryId,

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
      return res
        .status(400)
        .json({
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

async function getOutstandingEntries(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await getOutstandingEntriesService({
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

async function getIncompleteEntries(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await getIncompleteEntriesService({
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

async function markEntryComplete(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await markEntryCompleteService({
        projectId:
          req.params.projectId,

        userId,

        entryId:
          req.params.entryId,
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

async function completeProjectEntry(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await completeEntryService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

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

async function getEntryRevisions(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await getEntryRevisionsService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

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

async function getEntryRevision(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await getEntryRevisionService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

        revisionId:
          req.params.revisionId,

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

async function restoreEntryRevision(
  req,
  res,
  next,
) {
  try {
    const userId =
      requireUserId(req);

    const data =
      await restoreEntryRevisionService({
        projectId:
          req.params.projectId,

        entryId:
          req.params.entryId,

        revisionId:
          req.params.revisionId,

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

module.exports = {
  getProjectDetails,
  getAiProjectProgress,
  getLearningVideos,
  getAiProjectSpeech,
  searchProjectEntries,
  searchOwnedEntries,
  createProjectEntry,
  getOutstandingEntries,
  completeProjectEntry,
  getIncompleteEntries,
  markEntryComplete,
  updateEntry,
  deleteEntry,
  updateChecklistItem,
  archiveEntry,
  unarchiveEntry,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
  getEntryRevisions,
  getEntryRevision,
  restoreEntryRevision,
};
