-- Seed the brain graph from existing CRM contacts + manual strategic nodes.
-- Idempotent: re-running won't duplicate. Run after migration_006_brain.sql.

-- 1) Person nodes for every contact (one per contact_id).
INSERT INTO brain_nodes (type, title, body, tags, source, contact_id)
SELECT
  'person',
  c.name,
  NULLIF(CONCAT_WS(' — ', NULLIF(c.role, ''), NULLIF(c.organization, '')), ''),
  CASE WHEN c.category IS NOT NULL AND c.category <> '' THEN ARRAY[lower(c.category)] ELSE '{}'::text[] END,
  'seed',
  c.id
FROM contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM brain_nodes bn WHERE bn.contact_id = c.id
);

-- 2) Company nodes for each unique organization in contacts.
INSERT INTO brain_nodes (type, title, body, tags, source)
SELECT DISTINCT
  'company',
  c.organization,
  NULL,
  '{}'::text[],
  'seed'
FROM contacts c
WHERE c.organization IS NOT NULL
  AND c.organization <> ''
  AND NOT EXISTS (
    SELECT 1 FROM brain_nodes bn
    WHERE bn.type = 'company' AND lower(bn.title) = lower(c.organization)
  );

-- 3) works_at edges between person nodes and their company nodes.
INSERT INTO brain_edges (source_node_id, target_node_id, relationship, strength)
SELECT pn.id, cn.id, 'works_at', 7
FROM contacts c
JOIN brain_nodes pn ON pn.contact_id = c.id AND pn.type = 'person'
JOIN brain_nodes cn ON cn.type = 'company' AND lower(cn.title) = lower(c.organization)
WHERE c.organization IS NOT NULL AND c.organization <> ''
ON CONFLICT (source_node_id, target_node_id, relationship) DO NOTHING;

-- 4) Manual strategic nodes.
INSERT INTO brain_nodes (type, title, body, tags, source)
SELECT v.type, v.title, v.body, v.tags, 'seed'
FROM (VALUES
  (
    'strategy',
    'MLB-First Go-To-Market',
    'Baseline''s primary strategy: establish ACIS credibility through MLB partnerships before expanding to adjacent markets (MiLB, college, international).',
    ARRAY['strategy', 'mlb', 'gtm']
  ),
  (
    'technology',
    'ACIS',
    'Arm Care Intelligence System. ML model monitoring pitcher fatigue through workload metrics, biomechanical proxies, and prior injury history. Current AUC: 0.729 after May 1 retrain.',
    ARRAY['product', 'ml', 'acis']
  ),
  (
    'technology',
    'TrackMan',
    'Doppler radar-based pitch tracking system. Primary data source for ACIS. Partnership discussions active with Adam Katz.',
    ARRAY['data', 'partner', 'radar']
  ),
  (
    'technology',
    'Hawk-Eye',
    'Optical tracking system (ball + body). MLB''s biomechanical data provider. Baseline seeking data access, currently in MLB legal review.',
    ARRAY['data', 'biomechanics', 'mlb']
  ),
  (
    'milestone',
    'ACIS Model v2 Launch',
    'May 1, 2026 retrain. Added 6 prior injury history features. AUC improved to 0.729.',
    ARRAY['ml', 'launch', 'acis']
  ),
  (
    'decision',
    'SAFE Round Structure',
    '$3-4M SAFE, no valuation cap, 20% discount. Wyoming C-Corp.',
    ARRAY['fundraise', 'safe', 'legal']
  ),
  (
    'company',
    'Baseline Analytics',
    'AI-powered pitcher fatigue monitoring for MLB. Wyoming C-Corp. Founded by Chase Spivey (CEO) and Sheldon McClelland (COO).',
    ARRAY['baseline', 'company']
  )
) AS v(type, title, body, tags)
WHERE NOT EXISTS (
  SELECT 1 FROM brain_nodes bn
  WHERE bn.type = v.type AND lower(bn.title) = lower(v.title)
);
