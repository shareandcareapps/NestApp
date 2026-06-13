-- ═══════════════════════════════════════════════════════════════════════════
-- 002_conversations_and_retention.sql
-- Proper conversation typing (no more '→' title heuristics) + fixed retention.
-- Run AFTER 001_security_hardening.sql. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Schema: explicit conversation type + ride link ─────────────────────────

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS type    TEXT CHECK (type IN ('listing', 'ride', 'direct')),
  ADD COLUMN IF NOT EXISTS ride_id UUID;

-- Backfill from the old heuristics, once
UPDATE conversations SET type =
  CASE
    WHEN listing_id IS NOT NULL THEN 'listing'
    WHEN listing_title LIKE '%' || chr(8594) || '%' THEN 'ride'
    ELSE 'direct'
  END
WHERE type IS NULL;

ALTER TABLE conversations ALTER COLUMN type SET DEFAULT 'direct';

-- ── 2. Replace the old unique constraint ──────────────────────────────────────
-- The old constraint didn't include the thread discriminator, which forced the
-- app into a "rewrite another thread's title" fallback (data corruption).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'conversations'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- One thread per user-pair per context (listing, ride title, or direct)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_thread_uniq
  ON conversations (
    LEAST(participant_1, participant_2),
    GREATEST(participant_1, participant_2),
    COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(listing_title, '')
  );

-- ── 3. Reschedule retention crons (replaces supabase_retention.sql jobs) ─────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove the old heuristic-based jobs
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobid FROM cron.job
           WHERE jobname IN ('delete-past-rides', 'delete-stale-messages',
                             'expire-old-listings', 'hard-delete-listings')
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

-- Rides cleanup — nightly 2:00 AM.
-- Ride chats are removed only when their ride is gone AND the chat has been
-- quiet for 7 days (no more '→'-in-title guessing, no deleting active chats).
SELECT cron.schedule(
  'delete-past-rides',
  '0 2 * * *',
  $$
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.type = 'ride'
        AND (c.ride_id IS NULL OR NOT EXISTS (SELECT 1 FROM rides r WHERE r.id = c.ride_id))
        AND COALESCE(c.last_message_at, c.created_at) < NOW() - INTERVAL '7 days'
    );

    DELETE FROM conversations c
    WHERE c.type = 'ride'
      AND (c.ride_id IS NULL OR NOT EXISTS (SELECT 1 FROM rides r WHERE r.id = c.ride_id))
      AND COALESCE(c.last_message_at, c.created_at) < NOW() - INTERVAL '7 days';

    UPDATE rides SET is_active = false
    WHERE ride_date < NOW() - INTERVAL '1 day' AND is_active = true;

    DELETE FROM rides WHERE ride_date < NOW() - INTERVAL '7 days';
  $$
);

-- Stale classifieds chats — nightly 3:00 AM
SELECT cron.schedule(
  'delete-stale-messages',
  '0 3 * * *',
  $$
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      WHERE l.status IN ('sold', 'archived')
        AND COALESCE(c.last_message_at, c.created_at) < NOW() - INTERVAL '30 days'
    );
  $$
);

-- Listing expiry — nightly 4:00 AM
SELECT cron.schedule(
  'expire-old-listings',
  '0 4 * * *',
  $$
    UPDATE listings SET status = 'archived', is_active = false
    WHERE status = 'active'
      AND expires_at IS NOT NULL AND expires_at < NOW()
      AND deleted_at IS NULL;
  $$
);

-- Hard-delete soft-deleted listings — weekly Sunday 5:00 AM
SELECT cron.schedule(
  'hard-delete-listings',
  '0 5 * * 0',
  $$
    DELETE FROM listings
    WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
  $$
);
