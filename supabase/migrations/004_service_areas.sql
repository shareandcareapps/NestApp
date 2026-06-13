-- ═══════════════════════════════════════════════════════════════════════════
-- 004_service_areas.sql
-- Geographic access control — St. Louis, MO and suburbs within ~30 miles.
-- No hardcoded zips in app code. Expanding = one INSERT. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_areas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL DEFAULT 'MO',
  county     TEXT,
  zip_codes  TEXT[]      NOT NULL DEFAULT '{}',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read service areas"  ON service_areas;
DROP POLICY IF EXISTS "admin manage service areas" ON service_areas;
CREATE POLICY "public read service areas"  ON service_areas FOR SELECT USING (true);
CREATE POLICY "admin manage service areas" ON service_areas FOR ALL    USING (is_admin(auth.uid()));

-- ── 2. Add zip_code to profiles ───────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- ── 3. Helper RPC — called from client before signup ─────────────────────────

CREATE OR REPLACE FUNCTION public.check_service_area(p_zip TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_areas
    WHERE is_active = true
      AND p_zip = ANY(zip_codes)
  );
$$;

-- ── 4. Server-side gate on profile creation ───────────────────────────────────
-- To go nationwide: DROP TRIGGER trg_enforce_service_area ON profiles;

CREATE OR REPLACE FUNCTION public.enforce_service_area()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.zip_code IS NOT NULL AND NOT check_service_area(NEW.zip_code) THEN
    RAISE EXCEPTION 'NestApp is not yet available in zip code %. We are expanding soon!', NEW.zip_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_area ON profiles;
CREATE TRIGGER trg_enforce_service_area
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_service_area();

-- ── 5. Seed — Missouri only, within ~30 miles of downtown St. Louis ───────────

DELETE FROM service_areas WHERE county IS NOT NULL;

-- ─── St. Louis City (independent city) ───────────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('St. Louis', 'MO', 'St. Louis City', ARRAY[
  '63101','63102','63103','63104','63105','63106','63107','63108','63109','63110',
  '63111','63112','63113','63115','63116','63117','63118','63119','63120','63121',
  '63122','63123','63124','63125','63126','63127','63128','63129','63130','63131',
  '63132','63133','63134','63135','63136','63137','63138','63139','63140','63141',
  '63143','63144','63145','63147','63150'
]);

-- ─── St. Louis County (~0–25 miles) ──────────────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('Affton',           'MO', 'St. Louis County', ARRAY['63123']),
('Ballwin',          'MO', 'St. Louis County', ARRAY['63011','63021']),
('Berkeley',         'MO', 'St. Louis County', ARRAY['63134']),
('Brentwood',        'MO', 'St. Louis County', ARRAY['63144']),
('Bridgeton',        'MO', 'St. Louis County', ARRAY['63044']),
('Chesterfield',     'MO', 'St. Louis County', ARRAY['63005','63017','63141']),
('Clayton',          'MO', 'St. Louis County', ARRAY['63105']),
('Clarkson Valley',  'MO', 'St. Louis County', ARRAY['63005']),
('Crestwood',        'MO', 'St. Louis County', ARRAY['63126']),
('Creve Coeur',      'MO', 'St. Louis County', ARRAY['63141']),
('Des Peres',        'MO', 'St. Louis County', ARRAY['63131']),
('Ellisville',       'MO', 'St. Louis County', ARRAY['63011','63021']),
('Eureka',           'MO', 'St. Louis County', ARRAY['63025']),
('Fenton',           'MO', 'St. Louis County', ARRAY['63026']),
('Ferguson',         'MO', 'St. Louis County', ARRAY['63135']),
('Florissant',       'MO', 'St. Louis County', ARRAY['63031','63033','63034']),
('Frontenac',        'MO', 'St. Louis County', ARRAY['63131']),
('Glendale',         'MO', 'St. Louis County', ARRAY['63122']),
('Hazelwood',        'MO', 'St. Louis County', ARRAY['63042']),
('Jennings',         'MO', 'St. Louis County', ARRAY['63136']),
('Kirkwood',         'MO', 'St. Louis County', ARRAY['63122']),
('Ladue',            'MO', 'St. Louis County', ARRAY['63124']),
('Manchester',       'MO', 'St. Louis County', ARRAY['63011','63021','63088']),
('Maplewood',        'MO', 'St. Louis County', ARRAY['63143']),
('Maryland Heights', 'MO', 'St. Louis County', ARRAY['63043']),
('Mehlville',        'MO', 'St. Louis County', ARRAY['63125']),
('Normandy',         'MO', 'St. Louis County', ARRAY['63121']),
('Olivette',         'MO', 'St. Louis County', ARRAY['63132']),
('Overland',         'MO', 'St. Louis County', ARRAY['63114']),
('Pagedale',         'MO', 'St. Louis County', ARRAY['63133']),
('Richmond Heights', 'MO', 'St. Louis County', ARRAY['63117']),
('Riverview',        'MO', 'St. Louis County', ARRAY['63137']),
('Rock Hill',        'MO', 'St. Louis County', ARRAY['63119']),
('Shrewsbury',       'MO', 'St. Louis County', ARRAY['63119']),
('Spanish Lake',     'MO', 'St. Louis County', ARRAY['63138']),
('St. Ann',          'MO', 'St. Louis County', ARRAY['63074']),
('Sunset Hills',     'MO', 'St. Louis County', ARRAY['63127']),
('Town and Country', 'MO', 'St. Louis County', ARRAY['63017','63131']),
('University City',  'MO', 'St. Louis County', ARRAY['63130','63132']),
('Valley Park',      'MO', 'St. Louis County', ARRAY['63088']),
('Webster Groves',   'MO', 'St. Louis County', ARRAY['63119']),
('Wellston',         'MO', 'St. Louis County', ARRAY['63133']),
('Wildwood',         'MO', 'St. Louis County', ARRAY['63005','63038','63040','63069']),
('Winchester',       'MO', 'St. Louis County', ARRAY['63021']),
('Woodson Terrace',  'MO', 'St. Louis County', ARRAY['63134']);

-- ─── St. Charles County (~20–45 miles) ───────────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('Augusta',           'MO', 'St. Charles County', ARRAY['63332']),
('Cottleville',       'MO', 'St. Charles County', ARRAY['63304','63338']),
('Dardenne Prairie',  'MO', 'St. Charles County', ARRAY['63368']),
('Flint Hill',        'MO', 'St. Charles County', ARRAY['63363']),
('Foristell',         'MO', 'St. Charles County', ARRAY['63348']),
('Lake Saint Louis',  'MO', 'St. Charles County', ARRAY['63367']),
('New Melle',         'MO', 'St. Charles County', ARRAY['63365']),
('O''Fallon',         'MO', 'St. Charles County', ARRAY['63366','63368']),
('Portage des Sioux', 'MO', 'St. Charles County', ARRAY['63373']),
('St. Charles',       'MO', 'St. Charles County', ARRAY['63301','63302','63303','63304']),
('St. Peters',        'MO', 'St. Charles County', ARRAY['63376']),
('Wentzville',        'MO', 'St. Charles County', ARRAY['63385']),
('Wright City',       'MO', 'St. Charles County', ARRAY['63390']);

-- ─── Jefferson County (~18–42 miles south) ───────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('Arnold',       'MO', 'Jefferson County', ARRAY['63010']),
('Barnhart',     'MO', 'Jefferson County', ARRAY['63012']),
('Crystal City', 'MO', 'Jefferson County', ARRAY['63019']),
('De Soto',      'MO', 'Jefferson County', ARRAY['63020']),
('Festus',       'MO', 'Jefferson County', ARRAY['63028']),
('Herculaneum',  'MO', 'Jefferson County', ARRAY['63048']),
('Hillsboro',    'MO', 'Jefferson County', ARRAY['63050']),
('Imperial',     'MO', 'Jefferson County', ARRAY['63052']),
('Kimmswick',    'MO', 'Jefferson County', ARRAY['63053']),
('Pevely',       'MO', 'Jefferson County', ARRAY['63070']);

-- ─── Franklin County (~28–50 miles west) ─────────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('Pacific',     'MO', 'Franklin County', ARRAY['63069']),
('St. Clair',   'MO', 'Franklin County', ARRAY['63077']),
('Union',       'MO', 'Franklin County', ARRAY['63084']),
('Villa Ridge', 'MO', 'Franklin County', ARRAY['63089']),
('Washington',  'MO', 'Franklin County', ARRAY['63090']);

-- ─── Lincoln County (~40–47 miles northwest) ─────────────────────────────────
INSERT INTO service_areas (city, state, county, zip_codes) VALUES
('Troy',     'MO', 'Lincoln County', ARRAY['63379']),
('Winfield', 'MO', 'Lincoln County', ARRAY['63389']);
