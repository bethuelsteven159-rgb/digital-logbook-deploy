import { randomUUID } from "node:crypto";

/*
 * LOCAL DEVELOPMENT DATABASE ONLY.
 *
 * Temporary Prisma-like adapter for testing the
 * Project Details / Entries feature before the
 * real PostgreSQL + Prisma setup is available.
 *
 * DO NOT use this in production.
 */

const now = new Date();

const db = {
  users: [
    {
      id: "dev-user-1",
      email: "bethuel.test@wits.ac.za",
      name: "Bethuel Test User",
      bio: "Local development user",
      createdAt: now,
      updatedAt: now,
    },
  ],

  projects: [
    {
      id: "dev-project-1",
      ownerId: "dev-user-1",

      name: "Digital Logbook Project",

      description:
        "Temporary project used to test the Project Details and Entry features.",

      archivedAt: null,

      createdAt: new Date("2026-08-18T10:00:00.000Z"),
      updatedAt: new Date("2026-08-19T10:00:00.000Z"),
    },
  ],

  projectFields: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      projectId: "dev-project-1",
      name: "Work completed",

      fieldType: "short_text",

      position: 1,
      required: true,

      archivedAt: null,

      createdAt: new Date("2026-08-18T10:00:00.000Z"),

      updatedAt: new Date("2026-08-18T10:00:00.000Z"),
    },

    {
      id: "22222222-2222-4222-8222-222222222222",
      projectId: "dev-project-1",
      name: "Notes",

      fieldType: "long_text",

      position: 2,
      required: false,

      archivedAt: null,

      createdAt: new Date("2026-08-18T10:00:00.000Z"),

      updatedAt: new Date("2026-08-18T10:00:00.000Z"),
    },
  ],

  entries: [
    {
      id: "entry-1",

      projectId: "dev-project-1",
      createdById: "dev-user-1",

      name: "Project Details implementation",

      durationMinutes: 60,

      occurredAt: new Date("2026-08-19T12:00:00.000Z"),

      createdAt: new Date("2026-08-19T12:00:00.000Z"),

      updatedAt: new Date("2026-08-19T12:00:00.000Z"),
    },
  ],

  entryFieldValues: [
    {
      id: "value-1",

      entryId: "entry-1",
      fieldId: "11111111-1111-4111-8111-111111111111",

      valueText: "Implemented the Project Details page",

      valueNumber: null,
      valueDate: null,

      createdAt: new Date("2026-08-19T12:00:00.000Z"),
    },

    {
      id: "value-2",

      entryId: "entry-1",
      fieldId: "22222222-2222-4222-8222-222222222222",

      valueText: "This entry came from the local fake database.",

      valueNumber: null,
      valueDate: null,

      createdAt: new Date("2026-08-19T12:00:00.000Z"),
    },
  ],
};

/*
 * ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------
 */

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) {
      return true;
    }

    return record[key] === expected;
  });
}

function sortRows(rows, orderBy) {
  if (!orderBy) {
    return [...rows];
  }

  const [[field, direction]] = Object.entries(orderBy);

  return [...rows].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue === bValue) {
      return 0;
    }

    if (aValue === null || aValue === undefined) {
      return direction === "desc" ? 1 : -1;
    }

    if (bValue === null || bValue === undefined) {
      return direction === "desc" ? -1 : 1;
    }

    const result = aValue > bValue ? 1 : -1;

    return direction === "desc" ? -result : result;
  });
}

function selectScalarFields(record, select) {
  if (!select) {
    return { ...record };
  }

  const result = {};

  for (const [key, config] of Object.entries(select)) {
    if (config === true) {
      result[key] = record[key];
    }
  }

  return result;
}

function getProjectField(fieldId) {
  return db.projectFields.find((field) => field.id === fieldId);
}

function normalizeFieldValue(data) {
  return {
    id: data.id || randomUUID(),

    entryId: data.entryId,
    fieldId: data.fieldId,

    valueText: data.valueText === undefined ? null : data.valueText,

    valueNumber: data.valueNumber === undefined ? null : data.valueNumber,

    valueDate: data.valueDate === undefined ? null : data.valueDate,

    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };
}

function applyProjectFieldQuery(fields, config = {}) {
  let rows = [...fields];

  if (config.where) {
    rows = rows.filter((row) => matchesWhere(row, config.where));
  }

  if (config.orderBy) {
    rows = sortRows(rows, config.orderBy);
  }

  if (config.select) {
    rows = rows.map((row) => selectScalarFields(row, config.select));
  } else {
    rows = rows.map((row) => ({
      ...row,
    }));
  }

  return rows;
}

function buildProjectResult(project, { include, select } = {}) {
  /*
   * Prisma SELECT behaviour.
   */
  if (select) {
    const result = {};

    for (const [key, config] of Object.entries(select)) {
      if (config === true) {
        result[key] = project[key];
        continue;
      }

      if (key === "fields" || key === "projectFields") {
        const projectFields = db.projectFields.filter(
          (field) => field.projectId === project.id,
        );

        result[key] = applyProjectFieldQuery(
          projectFields,
          typeof config === "object" ? config : {},
        );
      }
    }

    return result;
  }

  /*
   * Prisma INCLUDE behaviour.
   */
  const result = { ...project };

  if (!include) {
    return result;
  }

  if (include.fields || include.projectFields) {
    const relationName = include.fields ? "fields" : "projectFields";

    const config = include[relationName];

    const projectFields = db.projectFields.filter(
      (field) => field.projectId === project.id,
    );

    result[relationName] = applyProjectFieldQuery(
      projectFields,
      typeof config === "object" ? config : {},
    );
  }

  return result;
}

function attachEntryValues(entry, include) {
  const result = { ...entry };

  if (!include) {
    return result;
  }

  const config = include.values || include.fieldValues;

  if (!config) {
    return result;
  }

  let values = db.entryFieldValues
    .filter((value) => value.entryId === entry.id)
    .map((value) => ({
      ...value,
    }));

  const nestedInclude = typeof config === "object" ? config.include : undefined;

  if (nestedInclude?.field) {
    values = values.map((value) => ({
      ...value,

      field: {
        ...getProjectField(value.fieldId),
      },
    }));
  }

  if (include.values) {
    result.values = values;
  }

  if (include.fieldValues) {
    result.fieldValues = values;
  }

  return result;
}

/*
 * ------------------------------------------------------------
 * Fake Prisma client
 * ------------------------------------------------------------
 */

const fakePrisma = {
  user: {
    async findUnique({ where, select } = {}) {
      const user = db.users.find((row) => matchesWhere(row, where));

      if (!user) {
        return null;
      }

      return select ? selectScalarFields(user, select) : { ...user };
    },

    async findFirst({ where, select } = {}) {
      const user = db.users.find((row) => matchesWhere(row, where));

      if (!user) {
        return null;
      }

      return select ? selectScalarFields(user, select) : { ...user };
    },
  },

  project: {
    async findUnique({ where, include, select } = {}) {
      const project = db.projects.find((row) => matchesWhere(row, where));

      if (!project) {
        return null;
      }

      return buildProjectResult(project, {
        include,
        select,
      });
    },

    async findFirst({ where, include, select } = {}) {
      const project = db.projects.find((row) => matchesWhere(row, where));

      if (!project) {
        return null;
      }

      return buildProjectResult(project, {
        include,
        select,
      });
    },
  },

  projectField: {
    async findMany({ where, orderBy, select } = {}) {
      let rows = db.projectFields.filter((row) => matchesWhere(row, where));

      rows = sortRows(rows, orderBy);

      if (select) {
        return rows.map((row) => selectScalarFields(row, select));
      }

      return rows.map((row) => ({
        ...row,
      }));
    },

    async findUnique({ where, select } = {}) {
      const field = db.projectFields.find((row) => matchesWhere(row, where));

      if (!field) {
        return null;
      }

      return select ? selectScalarFields(field, select) : { ...field };
    },

    async create({ data, select } = {}) {
      const field = {
        id: data.id || randomUUID(),

        projectId: data.projectId,

        name: data.name,

        fieldType: data.fieldType,

        position: data.position ?? 0,

        required: data.required ?? false,

        archivedAt: null,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.projectFields.push(field);

      return select ? selectScalarFields(field, select) : { ...field };
    },
  },

  entry: {
    async findMany({ where, orderBy, include } = {}) {
      let rows = db.entries.filter((row) => matchesWhere(row, where));

      rows = sortRows(rows, orderBy);

      return rows.map((entry) => attachEntryValues(entry, include));
    },

    async findUnique({ where, include } = {}) {
      const entry = db.entries.find((row) => matchesWhere(row, where));

      if (!entry) {
        return null;
      }

      return attachEntryValues(entry, include);
    },

    /*
     * Needed by getProjectDetailsService()
     * for total entries, total duration,
     * and latest activity.
     */
    async aggregate({ where, _count, _sum, _max } = {}) {
      const rows = db.entries.filter((row) => matchesWhere(row, where));

      const result = {};

      if (_count) {
        result._count = {};

        if (_count._all) {
          result._count._all = rows.length;
        }
      }

      if (_sum) {
        result._sum = {};

        if (_sum.durationMinutes) {
          result._sum.durationMinutes =
            rows.length === 0
              ? null
              : rows.reduce(
                  (total, row) => total + (row.durationMinutes ?? 0),
                  0,
                );
        }
      }

      if (_max) {
        result._max = {};

        if (_max.occurredAt) {
          result._max.occurredAt =
            rows.length === 0
              ? null
              : rows.reduce((latest, row) => {
                  if (!latest || row.occurredAt > latest) {
                    return row.occurredAt;
                  }

                  return latest;
                }, null);
        }
      }

      return result;
    },

    async create({ data, include } = {}) {
      const entry = {
        id: data.id || randomUUID(),

        projectId: data.projectId,

        createdById: data.createdById,

        name: data.name,

        durationMinutes: data.durationMinutes ?? 0,

        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),

        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),

        updatedAt: new Date(),
      };

      db.entries.push(entry);

      return attachEntryValues(entry, include);
    },
  },

  entryFieldValue: {
    async findMany({ where } = {}) {
      return db.entryFieldValues
        .filter((row) => matchesWhere(row, where))
        .map((row) => ({
          ...row,
        }));
    },

    async create({ data }) {
      const value = normalizeFieldValue(data);

      db.entryFieldValues.push(value);

      return { ...value };
    },

    async createMany({ data }) {
      const values = data.map((row) => normalizeFieldValue(row));

      db.entryFieldValues.push(...values);

      return {
        count: values.length,
      };
    },
  },

  /*
   * This is enough for the callback-style
   * transaction currently used by your service.
   */
  async $transaction(operation) {
    if (typeof operation === "function") {
      return operation(fakePrisma);
    }

    if (Array.isArray(operation)) {
      return Promise.all(operation);
    }

    throw new Error("Unsupported fake transaction.");
  },

  /*
   * Development debugging only.
   */
  __debug: {
    db,
  },
};

export { db };

export default fakePrisma;
