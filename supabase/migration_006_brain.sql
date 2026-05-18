-- Brain Graph: knowledge nodes and edges (the "second brain")

CREATE TABLE brain_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'person', 'company', 'strategy', 'decision', 'research',
    'idea', 'event', 'technology', 'term', 'milestone'
  )),
  title text NOT NULL,
  body text,
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brain_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  strength integer NOT NULL DEFAULT 5 CHECK (strength BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brain_edges_no_self_loop CHECK (source_node_id <> target_node_id),
  CONSTRAINT brain_edges_unique UNIQUE (source_node_id, target_node_id, relationship)
);

CREATE INDEX idx_brain_nodes_type ON brain_nodes(type);
CREATE INDEX idx_brain_nodes_contact_id ON brain_nodes(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_brain_nodes_updated ON brain_nodes(updated_at DESC);
CREATE INDEX idx_brain_edges_source ON brain_edges(source_node_id);
CREATE INDEX idx_brain_edges_target ON brain_edges(target_node_id);

-- Auto-update updated_at on brain_nodes
CREATE OR REPLACE FUNCTION update_brain_node_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_node_updated
  BEFORE UPDATE ON brain_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_brain_node_timestamp();

ALTER TABLE brain_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON brain_nodes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE brain_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON brain_edges FOR ALL USING (true) WITH CHECK (true);
