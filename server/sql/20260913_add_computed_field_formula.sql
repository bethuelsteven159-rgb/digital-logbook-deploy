ALTER TABLE project_fields
  ADD COLUMN IF NOT EXISTS formula TEXT;

ALTER TABLE project_fields
  DROP CONSTRAINT IF EXISTS project_fields_field_type_check;

ALTER TABLE project_fields
  ADD CONSTRAINT project_fields_field_type_check
  CHECK (
    field_type::text = ANY (
      ARRAY[
        'short_text',
        'long_text',
        'number',
        'date',
        'computed'
      ]::text[]
    )
  );
