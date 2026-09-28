const repository = require("../repositories/postgresRecurringEntryRepository");

const MAX_OCCURRENCES_PER_REQUEST = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate
    .split("-")
    .map(Number);

  return { year, month, day };
}

function formatIsoDate(year, month, day) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function toUtcMs(isoDate) {
  const { year, month, day } = parseIsoDate(isoDate);

  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(utcMs) {
  const date = new Date(utcMs);

  return formatIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function addDays(isoDate, days) {
  return fromUtcMs(toUtcMs(isoDate) + days * DAY_MS);
}

function lastDayOfMonth(year, month) {
  return new Date(
    Date.UTC(year, month, 0),
  ).getUTCDate();
}

// Anchor-preserving month arithmetic: always computes from the
// original day-of-month, clamping to the target month's length.
// Jan 31 + 1 month -> Feb 28/29, +2 months -> Mar 31.
function addMonthsClamped(isoDate, months) {
  const { year, month, day } = parseIsoDate(isoDate);

  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;

  return formatIsoDate(
    targetYear,
    targetMonth,
    Math.min(day, lastDayOfMonth(targetYear, targetMonth)),
  );
}

function toIsoDate(date) {
  return formatIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function computeOccurrenceDates({
  frequency,
  intervalCount,
  startsOn,
  endsOn = null,
  after = null,
  through,
  limit = MAX_OCCURRENCES_PER_REQUEST,
}) {
  let lowerBound = after ? addDays(after, 1) : startsOn;

  if (lowerBound < startsOn) {
    lowerBound = startsOn;
  }

  let upperBound = through;

  if (endsOn && endsOn < upperBound) {
    upperBound = endsOn;
  }

  if (lowerBound > upperBound) {
    return [];
  }

  const dates = [];

  if (frequency === "monthly") {
    const start = parseIsoDate(startsOn);
    const lower = parseIsoDate(lowerBound);

    const monthsDiff =
      (lower.year - start.year) * 12 +
      (lower.month - start.month);

    let index = Math.max(
      0,
      Math.floor(monthsDiff / intervalCount),
    );

    let candidate = addMonthsClamped(
      startsOn,
      index * intervalCount,
    );

    // Clamping can land before the lower bound; step forward
    // until the candidate reaches it.
    while (candidate < lowerBound) {
      index += 1;
      candidate = addMonthsClamped(
        startsOn,
        index * intervalCount,
      );
    }

    while (
      dates.length < limit &&
      candidate <= upperBound
    ) {
      dates.push(candidate);

      index += 1;
      candidate = addMonthsClamped(
        startsOn,
        index * intervalCount,
      );
    }

    return dates;
  }

  const stepDays =
    frequency === "weekly"
      ? intervalCount * 7
      : intervalCount;

  const startUtc = toUtcMs(startsOn);
  const diffDays = Math.round(
    (toUtcMs(lowerBound) - startUtc) / DAY_MS,
  );

  let index = Math.max(
    0,
    Math.ceil(diffDays / stepDays),
  );

  let candidateUtc =
    startUtc + index * stepDays * DAY_MS;

  while (
    dates.length < limit &&
    candidateUtc <= toUtcMs(upperBound)
  ) {
    dates.push(fromUtcMs(candidateUtc));

    index += 1;
    candidateUtc = startUtc + index * stepDays * DAY_MS;
  }

  return dates;
}

function serializeDefinition(definition) {
  return {
    id: definition.id,
    projectId: definition.projectId,
    name: definition.name,
    durationMinutes: definition.durationMinutes,
    tags: definition.tags,
    checklist: definition.checklist,
    frequency: definition.frequency,
    intervalCount: definition.intervalCount,
    startsOn: definition.startsOn,
    endsOn: definition.endsOn,
    enabled: definition.enabled,
    lastGeneratedOn: definition.lastGeneratedOn,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  };
}

async function listRecurringEntriesService({
  projectId,
  userId,
}) {
  const project = await repository.getOwnedProject(
    projectId,
    userId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const definitions =
    await repository.listDefinitions(projectId);

  return definitions.map(serializeDefinition);
}

async function createRecurringEntryService({
  projectId,
  userId,
  data,
}) {
  const project = await repository.getOwnedProject(
    projectId,
    userId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  if (project.archivedAt) {
    throw createHttpError(
      409,
      "Archived projects cannot be edited",
    );
  }

  const definition =
    await repository.createDefinition({
      projectId,
      createdById: userId,
      name: data.name,
      durationMinutes: data.durationMinutes,
      tags: data.tags,
      checklist: data.checklist,
      frequency: data.frequency,
      intervalCount: data.intervalCount,
      startsOn: data.startsOn,
      endsOn: data.endsOn ?? null,
      enabled: data.enabled,
    });

  return serializeDefinition(definition);
}

async function updateRecurringEntryService({
  definitionId,
  userId,
  data,
}) {
  const definition =
    await repository.getDefinitionWithOwner(
      definitionId,
    );

  if (
    !definition ||
    definition.projectOwnerId !== userId
  ) {
    throw createHttpError(
      404,
      "Recurring entry not found",
    );
  }

  if (definition.projectArchivedAt) {
    throw createHttpError(
      409,
      "Archived projects cannot be edited",
    );
  }

  const startsOn =
    data.startsOn ?? definition.startsOn;

  const endsOn =
    data.endsOn !== undefined
      ? data.endsOn
      : definition.endsOn;

  if (endsOn && endsOn < startsOn) {
    throw createHttpError(
      400,
      "End date cannot be earlier than start date",
    );
  }

  const updated = await repository.updateDefinition(
    definitionId,
    data,
  );

  return serializeDefinition(updated);
}

async function deleteRecurringEntryService({
  definitionId,
  userId,
}) {
  const definition =
    await repository.getDefinitionWithOwner(
      definitionId,
    );

  if (
    !definition ||
    definition.projectOwnerId !== userId
  ) {
    throw createHttpError(
      404,
      "Recurring entry not found",
    );
  }

  if (definition.projectArchivedAt) {
    throw createHttpError(
      409,
      "Archived projects cannot be edited",
    );
  }

  await repository.deleteDefinition(definitionId);

  return { id: definitionId };
}

async function generateDueRecurringEntriesService({
  projectId,
  userId,
  now = new Date(),
}) {
  const today = toIsoDate(now);

  return repository.withTransaction(async (tx) => {
    const project = await tx.getOwnedProject(
      projectId,
      userId,
    );

    if (!project) {
      throw createHttpError(404, "Project not found");
    }

    if (project.archivedAt) {
      return {
        generatedCount: 0,
        generatedEntries: [],
      };
    }

    const definitions =
      await tx.listEnabledDefinitions(projectId);

    // Due candidates from every enabled definition. Each definition
    // contributes at most MAX_OCCURRENCES_PER_REQUEST candidates
    // (its oldest), which is sufficient because the global cap
    // below never selects more than that many occurrences overall.
    const candidates = [];

    for (const definition of definitions) {
      const occurrenceDates = computeOccurrenceDates({
        frequency: definition.frequency,
        intervalCount: definition.intervalCount,
        startsOn: definition.startsOn,
        endsOn: definition.endsOn,
        after: definition.lastGeneratedOn,
        through: today,
      });

      for (const recurrenceDate of occurrenceDates) {
        candidates.push({
          definition,
          recurrenceDate,
        });
      }
    }

    // Global oldest-first ordering across all definitions, with
    // the definition id as a deterministic tie-breaker.
    candidates.sort((a, b) => {
      if (a.recurrenceDate !== b.recurrenceDate) {
        return a.recurrenceDate < b.recurrenceDate ? -1 : 1;
      }

      if (a.definition.id === b.definition.id) {
        return 0;
      }

      return a.definition.id < b.definition.id ? -1 : 1;
    });

    const selected = candidates.slice(
      0,
      MAX_OCCURRENCES_PER_REQUEST,
    );

    const generatedEntries = [];
    const processedDatesByDefinitionId = new Map();

    for (const {
      definition,
      recurrenceDate,
    } of selected) {
      const created =
        await tx.createRecurringOccurrence({
          definitionId: definition.id,
          projectId: definition.projectId,
          createdById: definition.createdById,
          name: definition.name,
          durationMinutes: definition.durationMinutes,
          tags: definition.tags,
          checklist: definition.checklist,
          recurrenceDate,
        });

      if (created) {
        generatedEntries.push({
          id: created.id,
          definitionId: definition.id,
          recurrenceDate: created.recurrenceDate,
        });
      }

      const processed =
        processedDatesByDefinitionId.get(definition.id) ??
        [];

      processed.push(recurrenceDate);
      processedDatesByDefinitionId.set(
        definition.id,
        processed,
      );
    }

    // The watermark advances only through occurrences actually
    // processed in this request, never beyond them, so backlog
    // beyond the global cap is left for the next request. It still
    // advances when inserts conflicted, so deleted occurrences are
    // never recreated.
    for (const [
      definitionId,
      processedDates,
    ] of processedDatesByDefinitionId) {
      await tx.advanceWatermark(
        definitionId,
        processedDates[processedDates.length - 1],
      );
    }

    return {
      generatedCount: generatedEntries.length,
      generatedEntries,
    };
  });
}

module.exports = {
  MAX_OCCURRENCES_PER_REQUEST,
  computeOccurrenceDates,
  addMonthsClamped,
  listRecurringEntriesService,
  createRecurringEntryService,
  updateRecurringEntryService,
  deleteRecurringEntryService,
  generateDueRecurringEntriesService,
};
