-- Tasks: quick todos, per-contact agenda items, urgent reach-outs

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('quick_todo', 'talk_about', 'reach_out_now')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  notes text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT tasks_contact_required_for_contact_kinds
    CHECK (
      (type = 'quick_todo' AND contact_id IS NULL)
      OR (type IN ('talk_about', 'reach_out_now') AND contact_id IS NOT NULL)
    ),
  CONSTRAINT tasks_completed_at_matches_status
    CHECK (
      (status = 'done' AND completed_at IS NOT NULL)
      OR (status = 'open' AND completed_at IS NULL)
    )
);

CREATE INDEX idx_tasks_type_status ON tasks(type, status);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_tasks_open_created ON tasks(created_at DESC) WHERE status = 'open';
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status = 'open' AND due_date IS NOT NULL;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
