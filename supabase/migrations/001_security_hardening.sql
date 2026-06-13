-- ═══════════════════════════════════════════════════════════════════════════
-- 001_security_hardening.sql
-- Full Row-Level Security + server-side enforcement for NestApp.
-- Idempotent: safe to run more than once in the Supabase SQL Editor.
--
-- What this does:
--   1. Helper functions (is_admin, is_suspended, is_blocked_between)
--   2. Profiles: RLS + auto-creation trigger + protected columns (points/role/…)
--   3. RLS on listings, rides, conversations, messages, message_reactions,
--      ride_bookings, sale_verifications, ratings, point_transactions
--   4. Server-side points (triggers) — replaces all client-side awarding
--   5. Booking RPCs with capacity enforcement (no client status writes)
--   6. Admin suspend RPC
--   7. Storage policies for the 'listings' bucket
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Schema prerequisites ───────────────────────────────────────────────────
-- Everything below is idempotent. This absorbs the old supabase_safety.sql
-- (which was never run) so this migration works on the database as-is.

-- profiles: columns referenced by policies, triggers and app code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role               TEXT    DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended          BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rides_age_attested BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points             INT     DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified        BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio                TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_rating       NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_rating_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_rating       NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_rating_count INT DEFAULT 0;

-- news: moderation/auto-pipeline columns
ALTER TABLE news ADD COLUMN IF NOT EXISTS draft          BOOLEAN DEFAULT false;
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url     TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE news ADD COLUMN IF NOT EXISTS admin_id       UUID;

-- listings: expiry + soft delete (from the old retention script)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
UPDATE listings SET expires_at = created_at + INTERVAL '60 days'
WHERE expires_at IS NULL AND status = 'active';

-- rides: confirmed-seat counter used by the booking RPCs
ALTER TABLE rides ADD COLUMN IF NOT EXISTS seats_booked INT DEFAULT 0;

-- Ledger written by the award_points() function
CREATE TABLE IF NOT EXISTS point_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points       INT         NOT NULL,
  action       TEXT        NOT NULL,
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Moderation tables (from the never-run safety script)
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

CREATE TABLE IF NOT EXISTS blocked_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  topic      TEXT        NOT NULL CHECK (topic IN ('bug','feature','content','other')),
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature tables the app uses — created only if missing (schemas match app code)
CREATE TABLE IF NOT EXISTS ride_bookings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id        UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id      UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','cancelled')),
  checkin_status TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS sale_verifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID        UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  seller_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','verified','disputed')),
  listing_title TEXT,
  listing_image TEXT,
  listing_price NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  reference_id UUID,
  rating       INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 0b. RLS for moderation tables + news ─────────────────────────────────────
-- (is_admin is needed by these policies, so it's defined here; section 1's
-- CREATE OR REPLACE of the same function is a harmless no-op re-definition.)

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can insert reports" ON reports;
CREATE POLICY "users can insert reports"
  ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "users see own reports" ON reports;
CREATE POLICY "users see own reports"
  ON reports FOR SELECT USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "admins see all reports" ON reports;
CREATE POLICY "admins see all reports"
  ON reports FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins update reports" ON reports;
CREATE POLICY "admins update reports"
  ON reports FOR UPDATE USING (is_admin(auth.uid()));

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own blocks" ON blocked_users;
CREATE POLICY "users manage own blocks"
  ON blocked_users USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "users can block" ON blocked_users;
CREATE POLICY "users can block"
  ON blocked_users FOR INSERT WITH CHECK (blocker_id = auth.uid());

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can submit feedback" ON feedback;
CREATE POLICY "users can submit feedback"
  ON feedback FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins can read feedback" ON feedback;
CREATE POLICY "admins can read feedback"
  ON feedback FOR SELECT USING (is_admin(auth.uid()));

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read published news" ON news;
CREATE POLICY "anyone can read published news"
  ON news FOR SELECT
  USING (draft = false OR (draft = true AND admin_id = auth.uid()));

DROP POLICY IF EXISTS "admins can insert news" ON news;
CREATE POLICY "admins can insert news"
  ON news FOR INSERT WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins can update news" ON news;
CREATE POLICY "admins can update news"
  ON news FOR UPDATE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins can delete news" ON news;
CREATE POLICY "admins can delete news"
  ON news FOR DELETE USING (is_admin(auth.uid()));

-- ── 1. Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_suspended(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT suspended FROM profiles WHERE id = uid), false);
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(a UUID, b UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;

-- Central, server-only point award. SECURITY DEFINER + bypass flag so the
-- profile-protection trigger lets it through.
CREATE OR REPLACE FUNCTION public.award_points(p_user UUID, p_points INT, p_action TEXT, p_ref UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.bypass_profile_protect', 'on', true);
  UPDATE profiles SET points = COALESCE(points, 0) + p_points WHERE id = p_user;
  INSERT INTO point_transactions (user_id, points, action, reference_id)
  VALUES (p_user, p_points, p_action, p_ref);
END;
$$;

-- ── 2. Profiles ───────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles are publicly readable" ON profiles;
CREATE POLICY "profiles are publicly readable"
  ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "users insert own profile" ON profiles;
CREATE POLICY "users insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users update own profile" ON profiles;
CREATE POLICY "users update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid() OR is_admin(auth.uid()));

-- No client DELETE — account deletion goes through the delete-account edge fn.

-- Username uniqueness (EditProfile relies on error code 23505).
-- Non-fatal if legacy duplicate usernames exist — fix them, then re-run.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uniq
    ON profiles (lower(username)) WHERE username IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'profiles_username_uniq skipped: duplicate usernames exist — deduplicate and re-run.';
END $$;

-- Protected columns: clients may edit identity fields only. points / role /
-- suspended / ratings / verification are server-managed. SECURITY DEFINER
-- functions set app.bypass_profile_protect; service role has auth.uid() NULL.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.bypass_profile_protect', true) = 'on'
     OR auth.uid() IS NULL
     OR is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.points              := OLD.points;
  NEW.role                := OLD.role;
  NEW.suspended           := OLD.suspended;
  NEW.is_verified         := OLD.is_verified;
  NEW.seller_rating       := OLD.seller_rating;
  NEW.seller_rating_count := OLD.seller_rating_count;
  NEW.driver_rating       := OLD.driver_rating;
  NEW.driver_rating_count := OLD.driver_rating_count;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- Auto-create a profile for every new auth user (covers email, Google, Apple).
-- full_name / phone arrive via auth.signUp options.data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  base := lower(regexp_replace(split_part(COALESCE(NEW.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base IS NULL OR length(base) < 3 THEN base := 'user'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE lower(username) = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  INSERT INTO profiles (id, full_name, phone, username, zip_code, city, state, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    candidate,
    NEW.raw_user_meta_data->>'zip_code',
    'St. Louis', 'Missouri', false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill: any existing auth user without a profile (e.g. past OAuth sign-ins)
INSERT INTO profiles (id, full_name, username, city, state, is_verified)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', ''),
       lower(regexp_replace(split_part(COALESCE(u.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g')) || '_' || left(u.id::text, 4),
       'St. Louis', 'Missouri', false
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ── 3. Listings ───────────────────────────────────────────────────────────────

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings are publicly readable" ON listings;
CREATE POLICY "listings are publicly readable"
  ON listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "users insert own listings" ON listings;
CREATE POLICY "users insert own listings"
  ON listings FOR INSERT
  WITH CHECK (user_id = auth.uid() AND NOT is_suspended(auth.uid()));

DROP POLICY IF EXISTS "owners update own listings" ON listings;
CREATE POLICY "owners update own listings"
  ON listings FOR UPDATE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "owners delete own listings" ON listings;
CREATE POLICY "owners delete own listings"
  ON listings FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- ── 4. Rides ──────────────────────────────────────────────────────────────────

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rides are publicly readable" ON rides;
CREATE POLICY "rides are publicly readable"
  ON rides FOR SELECT USING (true);

DROP POLICY IF EXISTS "users insert own rides" ON rides;
CREATE POLICY "users insert own rides"
  ON rides FOR INSERT
  WITH CHECK (
    auth.uid() IN (driver_id, requester_id)
    AND NOT is_suspended(auth.uid())
  );

DROP POLICY IF EXISTS "owners update own rides" ON rides;
CREATE POLICY "owners update own rides"
  ON rides FOR UPDATE
  USING (auth.uid() IN (driver_id, requester_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "owners delete own rides" ON rides;
CREATE POLICY "owners delete own rides"
  ON rides FOR DELETE
  USING (auth.uid() IN (driver_id, requester_id) OR is_admin(auth.uid()));

-- ── 5. Conversations ─────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants read conversations" ON conversations;
CREATE POLICY "participants read conversations"
  ON conversations FOR SELECT
  USING (auth.uid() IN (participant_1, participant_2));

DROP POLICY IF EXISTS "participants create conversations" ON conversations;
CREATE POLICY "participants create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IN (participant_1, participant_2)
    AND NOT is_suspended(auth.uid())
    AND NOT is_blocked_between(participant_1, participant_2)
  );

DROP POLICY IF EXISTS "participants update conversations" ON conversations;
CREATE POLICY "participants update conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() IN (participant_1, participant_2));

DROP POLICY IF EXISTS "participants delete conversations" ON conversations;
CREATE POLICY "participants delete conversations"
  ON conversations FOR DELETE
  USING (auth.uid() IN (participant_1, participant_2));

-- ── 6. Messages ───────────────────────────────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id AND uid IN (participant_1, participant_2)
  );
$$;

DROP POLICY IF EXISTS "participants read messages" ON messages;
CREATE POLICY "participants read messages"
  ON messages FOR SELECT
  USING (is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "participants send messages" ON messages;
CREATE POLICY "participants send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid())
    AND NOT is_suspended(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND is_blocked_between(c.participant_1, c.participant_2)
    )
  );

-- Participants may update messages (needed for is_read), but only the sender
-- may change the body — guarded by trigger below.
DROP POLICY IF EXISTS "participants update messages" ON messages;
CREATE POLICY "participants update messages"
  ON messages FOR UPDATE
  USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- service role
  NEW.sender_id       := OLD.sender_id;
  NEW.conversation_id := OLD.conversation_id;
  IF auth.uid() <> OLD.sender_id THEN
    NEW.body := OLD.body;  -- only the sender can edit their own text
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON messages;
CREATE TRIGGER trg_guard_message_update
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION guard_message_update();

-- ── 7. Message reactions ──────────────────────────────────────────────────────

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants read reactions" ON message_reactions;
CREATE POLICY "participants read reactions"
  ON message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND is_conversation_participant(m.conversation_id, auth.uid())
  ));

DROP POLICY IF EXISTS "participants add reactions" ON message_reactions;
CREATE POLICY "participants add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "users remove own reactions" ON message_reactions;
CREATE POLICY "users remove own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ── 8. Ride bookings ──────────────────────────────────────────────────────────
-- Status transitions go through RPCs only (capacity + role checks inside).

ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking parties read bookings" ON ride_bookings;
CREATE POLICY "booking parties read bookings"
  ON ride_bookings FOR SELECT
  USING (auth.uid() IN (rider_id, driver_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "riders request bookings" ON ride_bookings;
CREATE POLICY "riders request bookings"
  ON ride_bookings FOR INSERT
  WITH CHECK (
    rider_id = auth.uid()
    AND status = 'pending'
    AND NOT is_suspended(auth.uid())
    AND NOT is_blocked_between(rider_id, driver_id)
  );

-- No UPDATE/DELETE policies: clients must use the RPCs below.

CREATE OR REPLACE FUNCTION public.confirm_ride_booking(p_booking_id UUID)
RETURNS ride_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b ride_bookings;
  r rides;
  confirmed_count INT;
BEGIN
  SELECT * INTO b FROM ride_bookings WHERE id = p_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;

  SELECT * INTO r FROM rides WHERE id = b.ride_id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF auth.uid() IS DISTINCT FROM r.driver_id THEN
    RAISE EXCEPTION 'Only the driver can confirm bookings';
  END IF;

  SELECT COUNT(*) INTO confirmed_count
  FROM ride_bookings
  WHERE ride_id = b.ride_id AND status = 'confirmed' AND id <> b.id;

  IF confirmed_count >= COALESCE(r.seats_available, 1) THEN
    RAISE EXCEPTION 'Ride is full — no seats left to confirm';
  END IF;

  UPDATE ride_bookings SET status = 'confirmed' WHERE id = b.id RETURNING * INTO b;
  UPDATE rides SET seats_booked = confirmed_count + 1 WHERE id = b.ride_id;
  RETURN b;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_ride_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b ride_bookings;
  confirmed_count INT;
BEGIN
  SELECT * INTO b FROM ride_bookings WHERE id = p_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() NOT IN (b.rider_id, b.driver_id) THEN
    RAISE EXCEPTION 'Only the rider or driver can cancel this booking';
  END IF;

  UPDATE ride_bookings SET status = 'cancelled' WHERE id = b.id;

  SELECT COUNT(*) INTO confirmed_count
  FROM ride_bookings WHERE ride_id = b.ride_id AND status = 'confirmed';
  UPDATE rides SET seats_booked = confirmed_count WHERE id = b.ride_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_checkin(p_booking_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b ride_bookings;
BEGIN
  SELECT * INTO b FROM ride_bookings WHERE id = p_booking_id;
  IF b IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() IS DISTINCT FROM b.rider_id THEN
    RAISE EXCEPTION 'Only the rider can check in';
  END IF;
  UPDATE ride_bookings SET checkin_status = p_status WHERE id = b.id;
END;
$$;

-- ── 9. Sale verifications ─────────────────────────────────────────────────────
-- Seller creates/re-marks while pending; ONLY the buyer can resolve the status
-- (prevents sellers self-verifying for points).

ALTER TABLE sale_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale parties read verifications" ON sale_verifications;
CREATE POLICY "sale parties read verifications"
  ON sale_verifications FOR SELECT
  USING (auth.uid() IN (seller_id, buyer_id));

DROP POLICY IF EXISTS "sellers create verifications" ON sale_verifications;
CREATE POLICY "sellers create verifications"
  ON sale_verifications FOR INSERT
  WITH CHECK (seller_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "buyer resolves, seller re-marks" ON sale_verifications;
CREATE POLICY "buyer resolves, seller re-marks"
  ON sale_verifications FOR UPDATE
  USING (auth.uid() IN (seller_id, buyer_id))
  WITH CHECK (
    buyer_id = auth.uid()
    OR (seller_id = auth.uid() AND status = 'pending')
  );

-- Award seller 10 pts when buyer verifies the sale
CREATE OR REPLACE FUNCTION public.on_sale_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    PERFORM award_points(NEW.seller_id, 10, 'sale_verified', NEW.listing_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_sale_verified ON sale_verifications;
CREATE TRIGGER trg_on_sale_verified
  AFTER UPDATE ON sale_verifications
  FOR EACH ROW EXECUTE FUNCTION on_sale_verified();

-- ── 10. Ratings ───────────────────────────────────────────────────────────────

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings are publicly readable" ON ratings;
CREATE POLICY "ratings are publicly readable"
  ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "users submit own ratings" ON ratings;
CREATE POLICY "users submit own ratings"
  ON ratings FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND from_user_id <> to_user_id
    AND rating BETWEEN 1 AND 5
    AND NOT is_suspended(auth.uid())
  );

-- One rating per (rater, reference, type) — hasRated() relies on this.
-- Non-fatal if legacy duplicate ratings exist.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS ratings_once_per_reference
    ON ratings (from_user_id, reference_id, type);
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'ratings_once_per_reference skipped: duplicate ratings exist — deduplicate and re-run.';
END $$;

-- Recalculate aggregates + 5★ bonus, server-side
CREATE OR REPLACE FUNCTION public.apply_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  avg_rating NUMERIC;
  cnt INT;
BEGIN
  PERFORM set_config('app.bypass_profile_protect', 'on', true);

  IF NEW.type = 'ride' THEN
    SELECT AVG(rating), COUNT(*) INTO avg_rating, cnt
    FROM ratings WHERE to_user_id = NEW.to_user_id AND type = 'ride';
    UPDATE profiles
    SET driver_rating = ROUND(avg_rating, 2), driver_rating_count = cnt
    WHERE id = NEW.to_user_id;
  ELSE
    SELECT AVG(rating), COUNT(*) INTO avg_rating, cnt
    FROM ratings WHERE to_user_id = NEW.to_user_id AND type <> 'ride';
    UPDATE profiles
    SET seller_rating = ROUND(avg_rating, 2), seller_rating_count = cnt
    WHERE id = NEW.to_user_id;
  END IF;

  IF NEW.rating = 5 THEN
    PERFORM award_points(NEW.to_user_id, 5, 'received_5star', NEW.reference_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_rating ON ratings;
CREATE TRIGGER trg_apply_rating
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION apply_rating();

-- ── 11. Point transactions: read-only ledger for clients ─────────────────────

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own point transactions" ON point_transactions;
CREATE POLICY "users read own point transactions"
  ON point_transactions FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT policy: only SECURITY DEFINER triggers write here.

-- ── 12. Content-creation point triggers ───────────────────────────────────────

-- Listings: 20 pts for the first, 5 after (replaces the old trigger pair —
-- the original script created trg_listing_points but dropped
-- trg_award_listing_points, so re-runs could double-award).
DROP TRIGGER IF EXISTS trg_award_listing_points ON listings;
DROP TRIGGER IF EXISTS trg_listing_points ON listings;

CREATE OR REPLACE FUNCTION public.award_listing_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE listing_count INT;
BEGIN
  SELECT COUNT(*) INTO listing_count FROM listings WHERE user_id = NEW.user_id;
  IF listing_count = 1 THEN
    PERFORM award_points(NEW.user_id, 20, 'first_listing', NEW.id);
  ELSE
    PERFORM award_points(NEW.user_id, 5, 'post_listing', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listing_points
  AFTER INSERT ON listings
  FOR EACH ROW EXECUTE FUNCTION award_listing_points();

-- Rides: 10 pts for sharing a ride (replaces the client-side award)
CREATE OR REPLACE FUNCTION public.award_ride_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_points(COALESCE(NEW.driver_id, NEW.requester_id), 10, 'share_ride', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_points ON rides;
CREATE TRIGGER trg_ride_points
  AFTER INSERT ON rides
  FOR EACH ROW EXECUTE FUNCTION award_ride_points();

-- ── 13. Admin suspend RPC (replaces direct profiles.update from the app) ─────

CREATE OR REPLACE FUNCTION public.admin_set_suspended(p_user UUID, p_suspended BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  PERFORM set_config('app.bypass_profile_protect', 'on', true);
  UPDATE profiles SET suspended = p_suspended WHERE id = p_user;
END;
$$;

-- ── 14. Storage policies — 'listings' bucket ─────────────────────────────────

DROP POLICY IF EXISTS "listing images public read" ON storage.objects;
CREATE POLICY "listing images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

DROP POLICY IF EXISTS "authenticated users upload listing images" ON storage.objects;
CREATE POLICY "authenticated users upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated' AND NOT is_suspended(auth.uid()));

DROP POLICY IF EXISTS "owners delete own listing images" ON storage.objects;
CREATE POLICY "owners delete own listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listings' AND owner = auth.uid());

-- ── Done. Reminder: make yourself admin if not already: ──────────────────────
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID';
