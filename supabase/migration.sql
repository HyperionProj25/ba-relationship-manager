-- BA Relationship Manager — Supabase Migration
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- ============================================
-- Table: contacts
-- ============================================
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text,
  role text,
  email text,
  phone text,
  category text NOT NULL DEFAULT 'Other'
    CHECK (category IN ('MLB', 'Investor', 'IAB', 'Partner', 'Vendor', 'University', 'Other')),
  linkedin text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Table: interactions
-- ============================================
CREATE TABLE interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  summary text NOT NULL,
  date date NOT NULL,
  type text NOT NULL
    CHECK (type IN ('Call', 'Email', 'Meeting', 'Text', 'LinkedIn', 'In-Person')),
  details text,
  follow_up_needed boolean DEFAULT false,
  follow_up_date date,
  follow_up_action text,
  status text DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Done', 'Overdue')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Trigger: auto-update updated_at on contacts
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (open access, no auth)
-- ============================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON interactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_interactions_follow_up ON interactions(follow_up_needed, status, follow_up_date);
CREATE INDEX idx_contacts_category ON contacts(category);
