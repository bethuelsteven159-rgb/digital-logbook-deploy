# Database & Data Layer Documentation

This document covers the PostgreSQL database design, table relationships, entity schemas, and data-layer abstractions for the Digital Logbook backend.

---

## 1. Entity Relationship Diagram (ERD)

The database uses UUID primary keys and relies on cascading foreign keys to maintain relational integrity across projects, custom fields, and entry logs.

```text
+-------------------+       +-------------------+       +------------------------+
|       users       |       |     projects      |       |     project_fields     |
+-------------------+       +-------------------+       +------------------------+
| id (PK)           |<-----\| id (PK)           |<-----\| id (PK)                |
| google_id         |       | owner_id (FK)     |       | project_id (FK)        |
| email             |       | name              |       | name                   |
| name              |       | description       |       | field_type (CHECK)     |
| avatar_url        |       | archived_at       |       | position               |
+-------------------+       +-------------------+       | required               |
          |                           |                 +------------------------+
          |                           |                             |
          |                           |                             |
          |                         / |                             |
          |  +---------------------+  |                             |
          |  |       entries       |  |                             |
          |  +---------------------+  |                             |
          \--| id (PK)             |<-/                             |
             | project_id (FK)     |                                |
             | created_by_id (FK)  |                                |
             | name                |                                |
             | duration_minutes    |                                |
             | occurred_at         |                                |
             +---------------------+                                |
                        |                                           |
                        |     +--------------------------+          |
                        \---->|   entry_field_values     |<---------/
                              +--------------------------+
                              | id (PK)                  |
                              | entry_id (FK)            |
                              | field_id (FK)             |
                              | value_text               |
                              | value_number             |
                              | value_date               |
                              +--------------------------+