import prisma from "../lib/prisma.js";

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeFieldValue(value) {
  if (value.valueNumber !== null) {
    return Number(value.valueNumber);
  }

  if (value.valueDate !== null) {
    return value.valueDate.toISOString().slice(0, 10);
  }

  return value.valueText;
}

function serializeEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    durationMinutes: entry.durationMinutes,
    occurredAt: entry.occurredAt,
    createdAt: entry.createdAt,

    values: entry.values.map((value) => ({
      fieldId: value.fieldId,
      name: value.field.name,
      type: value.field.fieldType,
      value: serializeFieldValue(value),
    })),
  };
}

function convertValue(field, rawValue) {
  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === ""
  ) {
    return null;
  }

  switch (field.fieldType) {
    case "short_text":
    case "long_text":
      return {
        valueText: String(rawValue),
      };

    case "number": {
      const number = Number(rawValue);

      if (!Number.isFinite(number)) {
        throw createHttpError(
          400,
          `${field.name} must contain a valid number`,
        );
      }

      return {
        valueNumber: number,
      };
    }

    case "date": {
      const date = new Date(`${rawValue}T00:00:00.000Z`);

      if (Number.isNaN(date.getTime())) {
        throw createHttpError(
          400,
          `${field.name} must contain a valid date`,
        );
      }

      return {
        valueDate: date,
      };
    }

    default:
      throw createHttpError(
        400,
        `Unsupported field type: ${field.fieldType}`,
      );
  }
}

export async function getProjectDetailsService({
  projectId,
  userId,
}) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },

    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,

      fields: {
        where: {
          archivedAt: null,
        },

        orderBy: {
          position: "asc",
        },

        select: {
          id: true,
          name: true,
          fieldType: true,
          position: true,
          required: true,
        },
      },
    },
  });

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const [stats, entries] = await Promise.all([
    prisma.entry.aggregate({
      where: {
        projectId,
      },

      _count: {
        _all: true,
      },

      _sum: {
        durationMinutes: true,
      },

      _max: {
        occurredAt: true,
      },
    }),

    prisma.entry.findMany({
      where: {
        projectId,
      },

      orderBy: {
        occurredAt: "desc",
      },

      include: {
        values: {
          include: {
            field: true,
          },
        },
      },
    }),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
    },

    stats: {
      totalEntries: stats._count._all,
      loggedMinutes: stats._sum.durationMinutes ?? 0,
      lastActivity: stats._max.occurredAt,
    },

    fields: project.fields,

    entries: entries.map(serializeEntry),
  };
}

export async function createEntryService({
  projectId,
  userId,
  data,
}) {
  return prisma.$transaction(async (tx) => {
    /*
      Make sure the logged-in user actually owns this project.
    */
    const project = await tx.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },

      select: {
        id: true,
      },
    });

    if (!project) {
      throw createHttpError(404, "Project not found");
    }

    /*
      Get the fields currently belonging to this project.
    */
    const existingFields = await tx.projectField.findMany({
      where: {
        projectId,
        archivedAt: null,
      },

      orderBy: {
        position: "asc",
      },
    });

    const existingFieldMap = new Map(
      existingFields.map((field) => [field.id, field]),
    );

    /*
      Protect against somebody sending a field ID belonging
      to a different project.
    */
    for (const suppliedValue of data.values) {
      if (!existingFieldMap.has(suppliedValue.fieldId)) {
        throw createHttpError(
          400,
          "One of the submitted fields does not belong to this project",
        );
      }
    }

    /*
      Prevent duplicate custom field names.
    */
    const usedNames = new Set(
      existingFields.map((field) =>
        field.name.trim().toLowerCase(),
      ),
    );

    for (const field of data.newFields) {
      const normalizedName = field.name
        .trim()
        .toLowerCase();

      if (usedNames.has(normalizedName)) {
        throw createHttpError(
          409,
          `A field named "${field.name}" already exists`,
        );
      }

      usedNames.add(normalizedName);
    }

    /*
      Create any fields the user added from inside the modal.
    */
    const newlyCreatedFields = [];

    for (let index = 0; index < data.newFields.length; index += 1) {
      const requestedField = data.newFields[index];

      const createdField = await tx.projectField.create({
        data: {
          projectId,
          name: requestedField.name.trim(),
          fieldType: requestedField.type,
          position: existingFields.length + index,
        },
      });

      newlyCreatedFields.push({
        ...createdField,
        clientId: requestedField.clientId,
        submittedValue: requestedField.value,
      });
    }

    /*
      Create the actual logbook entry.
    */
    const entry = await tx.entry.create({
      data: {
        projectId,
        createdById: userId,
        name: data.name.trim(),
        durationMinutes: data.durationMinutes,
      },
    });

    const valuesToCreate = [];

    /*
      Existing project fields.
    */
    for (const submitted of data.values) {
      const field = existingFieldMap.get(
        submitted.fieldId,
      );

      const converted = convertValue(
        field,
        submitted.value,
      );

      if (!converted) {
        continue;
      }

      valuesToCreate.push({
        entryId: entry.id,
        fieldId: field.id,
        ...converted,
      });
    }

    /*
      Fields added while making this entry.
    */
    for (const field of newlyCreatedFields) {
      const converted = convertValue(
        field,
        field.submittedValue,
      );

      if (!converted) {
        continue;
      }

      valuesToCreate.push({
        entryId: entry.id,
        fieldId: field.id,
        ...converted,
      });
    }

    if (valuesToCreate.length > 0) {
      await tx.entryFieldValue.createMany({
        data: valuesToCreate,
      });
    }

    const completeEntry = await tx.entry.findUnique({
      where: {
        id: entry.id,
      },

      include: {
        values: {
          include: {
            field: true,
          },
        },
      },
    });

    return serializeEntry(completeEntry);
  });
}