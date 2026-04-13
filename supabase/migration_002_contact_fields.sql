-- Migration 002: add relationship_owner, touch_type, priority to contacts
-- Run in Supabase SQL Editor after migration.sql

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS relationship_owner text,
  ADD COLUMN IF NOT EXISTS touch_type text
    CHECK (touch_type IN ('Direct', 'Indirect')),
  ADD COLUMN IF NOT EXISTS priority text
    CHECK (priority IN ('High', 'Medium', 'Low'));

CREATE INDEX IF NOT EXISTS idx_contacts_touch_type ON contacts(touch_type);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
