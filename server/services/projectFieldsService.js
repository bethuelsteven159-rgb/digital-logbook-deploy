const { z } = require('zod');
const { bindFormulaToFields } = require('./computedFieldService');

const fieldTypes = z.enum(['short_text', 'long_text', 'number', 'date', 'computed']);
const fieldsSchema = z.array(
  z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: fieldTypes.optional(),
    type: fieldTypes.optional(),
    formula: z.string().trim().max(2000).nullable().optional(),
  }),
);

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

async function syncProjectFields(client, projectId, requestedFields) {
  const parsed = fieldsSchema.safeParse(requestedFields);
  if (!parsed.success) {
    throw httpError(400, 'Fields must be a list of valid fields with names of 1–100 characters');
  }

  const { rows: currentFields } = await client.query(
    `SELECT id, name, field_type, formula, position
     FROM project_fields
     WHERE project_id = $1 AND archived_at IS NULL
     ORDER BY position ASC, created_at ASC
     FOR UPDATE`,
    [projectId],
  );
  const currentById = new Map(currentFields.map((field) => [field.id, field]));
  const ids = new Set();
  const names = new Set();
  const fields = parsed.data.map((supplied) => {
    const existing = supplied.id ? currentById.get(supplied.id) : null;
    if (supplied.id && !existing) {
      throw httpError(400, 'One of the supplied project fields is invalid');
    }
    if (supplied.id && ids.has(supplied.id)) {
      throw httpError(400, 'A project field cannot be supplied more than once');
    }
    ids.add(supplied.id);
    const name = supplied.name ?? supplied.label ?? existing?.name;
    const fieldType = supplied.fieldType ?? supplied.type ?? existing?.field_type;
    if (!name || !fieldType) {
      throw httpError(400, 'New fields require a name and type');
    }
    if (existing && fieldType !== existing.field_type) {
      throw httpError(409, 'Existing field types cannot be changed; add a new field instead');
    }
    if (names.has(name.toLowerCase())) {
      throw httpError(409, `A field named "${name}" already exists`);
    }
    names.add(name.toLowerCase());
    return { id: supplied.id, name, fieldType, formula: supplied.formula ?? null };
  });

  for (const field of currentFields.filter((item) => item.field_type === 'computed')) {
    const formula = bindFormulaToFields(field.formula, currentFields);
    if (formula !== field.formula) {
      await client.query('UPDATE project_fields SET formula = $2 WHERE id = $1', [
        field.id,
        formula,
      ]);
    }
  }

  // Temporarily archive retained fields too so name swaps satisfy the active-name unique index.
  await client.query(
    `UPDATE project_fields SET archived_at = NOW(), updated_at = NOW()
     WHERE project_id = $1 AND archived_at IS NULL`,
    [projectId],
  );

  for (const [position, field] of fields.entries()) {
    if (field.id) {
      await client.query(
        `UPDATE project_fields
         SET name = $2, position = $3, archived_at = NULL, updated_at = NOW()
         WHERE id = $1 AND project_id = $4`,
        [field.id, field.name, position, projectId],
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO project_fields (project_id, name, field_type, formula, position, required)
         VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING id`,
        [
          projectId,
          field.name,
          field.fieldType,
          field.fieldType === 'computed' ? field.formula : null,
          position,
        ],
      );
      field.id = rows[0].id;
      field.isNew = true;
    }
  }

  for (const field of fields.filter((item) => item.isNew && item.fieldType === 'computed')) {
    await client.query('UPDATE project_fields SET formula = $2 WHERE id = $1', [
      field.id,
      bindFormulaToFields(field.formula, fields),
    ]);
  }
}

module.exports = { syncProjectFields };
