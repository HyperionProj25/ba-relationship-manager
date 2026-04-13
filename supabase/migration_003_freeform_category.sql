-- Migration 003: allow free-form categories (e.g. "Baseline", "Internal")
-- Drops the CHECK constraint so any text category is allowed. The app
-- still suggests a built-in list, but users can add new categories.

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_category_check;
