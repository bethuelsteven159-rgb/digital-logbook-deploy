const db = require("../db");

function mapAutomationRule(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    name: row.name,
    conditionFieldId: row.condition_field_id,
    conditionOperator: row.condition_operator,
    conditionValue: row.condition_value,
    actionType: row.action_type,
    actionValue: row.action_value,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const RULE_COLUMNS = `
  id,
  owner_id,
  project_id,
  name,
  condition_field_id,
  condition_operator,
  condition_value,
  action_type,
  action_value,
  enabled,
  created_at,
  updated_at
`;

const repository = {
  async createAutomationRule({
    ownerId,
    projectId,
    name,
    conditionFieldId,
    conditionOperator,
    conditionValue,
    actionType,
    actionValue,
    enabled,
  }) {
    const result = await db.query(
      `
        INSERT INTO automation_rules (
          owner_id,
          project_id,
          name,
          condition_field_id,
          condition_operator,
          condition_value,
          action_type,
          action_value,
          enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${RULE_COLUMNS}
      `,
      [
        ownerId,
        projectId,
        name,
        conditionFieldId,
        conditionOperator,
        conditionValue ?? null,
        actionType,
        actionValue,
        enabled ?? true,
      ],
    );

    return mapAutomationRule(result.rows[0]);
  },

  async getAutomationRulesForProject({ ownerId, projectId }) {
    const result = await db.query(
      `
        SELECT ${RULE_COLUMNS}
        FROM automation_rules
        WHERE owner_id = $1
          AND project_id = $2
        ORDER BY created_at DESC
      `,
      [ownerId, projectId],
    );

    return result.rows.map(mapAutomationRule);
  },

  async getAutomationRuleById({ ruleId, ownerId }) {
    const result = await db.query(
      `
        SELECT ${RULE_COLUMNS}
        FROM automation_rules
        WHERE id = $1
          AND owner_id = $2
        LIMIT 1
      `,
      [ruleId, ownerId],
    );

    return mapAutomationRule(result.rows[0]);
  },

  async updateAutomationRule({
    ruleId,
    ownerId,
    name,
    conditionFieldId,
    conditionOperator,
    conditionValue,
    actionType,
    actionValue,
    enabled,
  }) {
    const result = await db.query(
      `
        UPDATE automation_rules
        SET name = $3,
            condition_field_id = $4,
            condition_operator = $5,
            condition_value = $6,
            action_type = $7,
            action_value = $8,
            enabled = $9,
            updated_at = NOW()
        WHERE id = $1
          AND owner_id = $2
        RETURNING ${RULE_COLUMNS}
      `,
      [
        ruleId,
        ownerId,
        name,
        conditionFieldId,
        conditionOperator,
        conditionValue ?? null,
        actionType,
        actionValue,
        enabled,
      ],
    );

    return mapAutomationRule(result.rows[0]);
  },

  async deleteAutomationRule({ ruleId, ownerId }) {
    const result = await db.query(
      `
        DELETE FROM automation_rules
        WHERE id = $1
          AND owner_id = $2
        RETURNING id
      `,
      [ruleId, ownerId],
    );

    return result.rowCount > 0;
  },
};

repository.mapAutomationRule = mapAutomationRule;

module.exports = repository;
