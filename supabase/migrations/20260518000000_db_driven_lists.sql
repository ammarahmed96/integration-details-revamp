-- 1. New definition tables
CREATE TABLE cohort_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO cohort_definitions (name, display_name, sort_order) VALUES
  ('lcs','LCS',1),('lung','Lung',2),('g_lung','G Lung',3),
  ('aaa','AAA',4),('taa','TAA',5),('pancreas','Pancreas',6),
  ('ielcap','IELCAP',7),('thyroid','Thyroid',8),('liver','Liver',9),
  ('renal','Renal',10),('calcium','Calcium',11),('af','AF',12),('breast','Breast',13);

CREATE TABLE config_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  value text NOT NULL,
  display_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, value)
);

INSERT INTO config_list_items (category, value, display_name, sort_order) VALUES
  ('middleware','eon-middleware','eon-middleware',1),
  ('middleware','eon-hca-middleware','eon-hca-middleware',2),
  ('middleware','eon-middleware-bmhcc','eon-middleware-bmhcc',3),
  ('middleware','eon-lpnt-middleware','eon-lpnt-middleware',4),
  ('middleware','eon-ascension-middleware','eon-ascension-middleware',5),
  ('middleware','eon-uch-middleware','eon-uch-middleware',6),
  ('middleware','eon-geisinger-middleware','eon-geisinger-middleware',7),
  ('middleware','eon-middleware-queue','eon-middleware-queue',8);

-- 2. Alter cohort columns from enum to text
ALTER TABLE facility_cohorts ALTER COLUMN cohort TYPE text USING cohort::text;
ALTER TABLE facility_cm_cohorts ALTER COLUMN cohort TYPE text USING cohort::text;
ALTER TABLE facility_icp_golive ALTER COLUMN cohort TYPE text USING cohort::text;

-- 3. Drop enum (after altering all columns)
DROP TYPE cohort_type;

-- 4. Remove hardcoded CHECK on parsing_middleware
ALTER TABLE epic_integrations DROP CONSTRAINT IF EXISTS epic_integrations_parsing_middleware_check;

-- 5. RLS
ALTER TABLE cohort_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_cohort_definitions" ON cohort_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auditor_manage_cohort_definitions" ON cohort_definitions
  FOR ALL TO authenticated USING (is_auditor()) WITH CHECK (is_auditor());

CREATE POLICY "authenticated_read_config_list_items" ON config_list_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auditor_manage_config_list_items" ON config_list_items
  FOR ALL TO authenticated USING (is_auditor()) WITH CHECK (is_auditor());
