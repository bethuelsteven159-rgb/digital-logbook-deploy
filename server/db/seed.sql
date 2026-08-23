INSERT INTO users (id, google_id, name, email)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'google-test-123', 'Test Student', 'student@wits.ac.za')
ON CONFLICT DO NOTHING;

INSERT INTO projects (id, owner_id, name, description)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'COMS3011A Logbook', 'Building digital logbook backend API')
ON CONFLICT DO NOTHING;

INSERT INTO project_fields (id, project_id, name, field_type, position, required)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Difficulty Level', 'number', 1, true),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Notes', 'short_text', 2, false)
ON CONFLICT DO NOTHING;
