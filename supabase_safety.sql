-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ DEPRECATED — DO NOT RE-RUN ⚠️
-- Superseded by supabase/migrations/001_security_hardening.sql, which covers
-- everything here plus full RLS, fixes the trigger-name bug in section 4
-- (re-running this file double-awards listing points), and moves points to
-- point_transactions. Kept for historical reference only.
-- ═══════════════════════════════════════════════════════════════════════════
-- NestApp Safety & Moderation — Run once in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Schema additions FIRST (policies below reference these columns) ────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role               TEXT    DEFAULT 'user' CHECK (role IN ('user','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rides_age_attested BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended          BOOLEAN DEFAULT false;

ALTER TABLE news ADD COLUMN IF NOT EXISTS draft          BOOLEAN DEFAULT false;
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url     TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- ── 1. reports table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  listing_id        UUID        REFERENCES listings(id) ON DELETE SET NULL,
  ride_id           UUID        REFERENCES rides(id) ON DELETE SET NULL,
  reason            TEXT        NOT NULL,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "users see own reports"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "admins see all reports"
  ON reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. blocked_users table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own blocks"
  ON blocked_users
  USING (blocker_id = auth.uid());

CREATE POLICY "users can block"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- ── 3. news RLS: only admins and auto pipeline can insert ────────────────────
-- Skip if news table already has RLS enabled — check first with:
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'news';
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published news"
  ON news FOR SELECT
  USING (draft = false OR (draft = true AND admin_id = auth.uid()));

CREATE POLICY "admins can insert news"
  ON news FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins can update news"
  ON news FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins can delete news"
  ON news FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 4. points: DB trigger prevents client-side farming ───────────────────────
CREATE OR REPLACE FUNCTION award_listing_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  listing_count INT;
  points_amount INT;
  reason_label  TEXT;
BEGIN
  SELECT COUNT(*) INTO listing_count FROM listings WHERE user_id = NEW.user_id;
  IF listing_count = 1 THEN
    points_amount := 20; reason_label := 'first_listing';
  ELSE
    points_amount := 5;  reason_label := 'post_listing';
  END IF;

  UPDATE profiles SET points = COALESCE(points, 0) + points_amount WHERE id = NEW.user_id;

  INSERT INTO points_log (user_id, points, reason, reference_id)
  VALUES (NEW.user_id, points_amount, reason_label, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_listing_points ON listings;
CREATE TRIGGER trg_listing_points
  AFTER INSERT ON listings
  FOR EACH ROW EXECUTE FUNCTION award_listing_points();

-- ── 5. Make yourself admin ────────────────────────────────────────────────────
-- Run this once with your own user ID (find it in Authentication → Users):
--
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID';

-- ── 6. feedback table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  topic      TEXT        NOT NULL CHECK (topic IN ('bug','feature','content','other')),
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins can read feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 7. Schedule auto-news edge function (runs every 6 hours) ────────────────
-- Requires pg_cron and the edge function to be deployed first.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY below, then uncomment.
--
-- SELECT cron.schedule(
--   'auto-news-fetch',
--   '0 */6 * * *',
--   $$
--     SELECT net.http_post(
--       url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-news',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--       ),
--       body    := '{}'::jsonb
--     );
--   $$
-- );
