-- ═══════════════════════════════════════════════════════════════════════════
-- 003_rate_limits.sql
-- Server-side spam protection. Without this, one account can insert unlimited
-- messages/listings/reports through the API. Limits are generous for real
-- users and only bite scripted abuse. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- Generic helper: raises if the user created more than p_limit rows in the
-- given table within the window. Runs as definer so RLS doesn't hide rows.
CREATE OR REPLACE FUNCTION public.assert_rate_limit(
  p_table TEXT, p_user_col TEXT, p_user UUID, p_limit INT, p_window INTERVAL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I = $1 AND created_at > NOW() - $2',
    p_table, p_user_col
  ) INTO cnt USING p_user, p_window;
  IF cnt >= p_limit THEN
    RAISE EXCEPTION 'Rate limit reached — please slow down and try again later.';
  END IF;
END;
$$;

-- Messages: 30 per minute
CREATE OR REPLACE FUNCTION public.rl_messages() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM assert_rate_limit('messages', 'sender_id', NEW.sender_id, 30, INTERVAL '1 minute');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rl_messages ON messages;
CREATE TRIGGER trg_rl_messages BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION rl_messages();

-- Listings: 10 per hour
CREATE OR REPLACE FUNCTION public.rl_listings() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM assert_rate_limit('listings', 'user_id', NEW.user_id, 10, INTERVAL '1 hour');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rl_listings ON listings;
CREATE TRIGGER trg_rl_listings BEFORE INSERT ON listings FOR EACH ROW EXECUTE FUNCTION rl_listings();

-- Rides: 10 per hour
CREATE OR REPLACE FUNCTION public.rl_rides() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM assert_rate_limit('rides', 'driver_id', COALESCE(NEW.driver_id, NEW.requester_id), 10, INTERVAL '1 hour');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rl_rides ON rides;
CREATE TRIGGER trg_rl_rides BEFORE INSERT ON rides FOR EACH ROW EXECUTE FUNCTION rl_rides();

-- Reports: 20 per day; Feedback: 10 per day
CREATE OR REPLACE FUNCTION public.rl_reports() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM assert_rate_limit('reports', 'reporter_id', NEW.reporter_id, 20, INTERVAL '1 day');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rl_reports ON reports;
CREATE TRIGGER trg_rl_reports BEFORE INSERT ON reports FOR EACH ROW EXECUTE FUNCTION rl_reports();

CREATE OR REPLACE FUNCTION public.rl_feedback() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    PERFORM assert_rate_limit('feedback', 'user_id', NEW.user_id, 10, INTERVAL '1 day');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rl_feedback ON feedback;
CREATE TRIGGER trg_rl_feedback BEFORE INSERT ON feedback FOR EACH ROW EXECUTE FUNCTION rl_feedback();
