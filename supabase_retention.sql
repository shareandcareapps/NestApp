-- ═══════════════════════════════════════════════════════════════════════════
-- NestApp Data Retention — Run this entire script once in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Schema changes ────────────────────────────────────────────────────────

-- Listings: add expiry and soft-delete columns
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- Backfill expires_at for all existing active listings (60 days from created_at)
UPDATE listings
SET expires_at = created_at + INTERVAL '60 days'
WHERE expires_at IS NULL AND status = 'active';

-- Rides: no schema change needed (ride_date already exists)

-- ── 2. Enable pg_cron ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 3. Rides cleanup — runs nightly at 2:00 AM ───────────────────────────────
-- Deletes rides + their conversations + messages 7 days after the ride date.
SELECT cron.schedule(
  'delete-past-rides',
  '0 2 * * *',
  $$
    -- Delete messages in ride conversations first (FK constraint)
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.listing_id IS NULL
        AND c.listing_title IS NOT NULL
        AND c.listing_title LIKE '%→%'
        AND c.created_at < NOW() - INTERVAL '7 days'
    );

    -- Delete those ride conversations
    DELETE FROM conversations
    WHERE listing_id IS NULL
      AND listing_title IS NOT NULL
      AND listing_title LIKE '%→%'
      AND created_at < NOW() - INTERVAL '7 days';

    -- Deactivate past rides (soft)
    UPDATE rides
    SET is_active = false
    WHERE ride_date < NOW() - INTERVAL '1 day'
      AND is_active = true;

    -- Hard delete rides older than 7 days
    DELETE FROM rides
    WHERE ride_date < NOW() - INTERVAL '7 days';
  $$
);

-- ── 4. Messages cleanup — runs nightly at 3:00 AM ───────────────────────────
-- Classifieds conversations: delete messages after 30 days of inactivity on a closed listing.
-- Ride conversations: already handled above.
SELECT cron.schedule(
  'delete-stale-messages',
  '0 3 * * *',
  $$
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      WHERE l.status IN ('sold', 'archived')
        AND c.updated_at < NOW() - INTERVAL '30 days'
    );
  $$
);

-- ── 5. Listing expiry — runs nightly at 4:00 AM ──────────────────────────────
-- Auto-archives listings that passed their expires_at without renewal.
SELECT cron.schedule(
  'expire-old-listings',
  '0 4 * * *',
  $$
    UPDATE listings
    SET status = 'archived', is_active = false
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      AND deleted_at IS NULL;
  $$
);

-- ── 6. Hard-delete soft-deleted listings — runs weekly Sunday 5:00 AM ───────
-- Listings are soft-deleted first (deleted_at set). After 30 days, hard-delete.
SELECT cron.schedule(
  'hard-delete-listings',
  '0 5 * * 0',
  $$
    DELETE FROM listings
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days';
  $$
);

-- ── 7. Storage dashboard query (run manually any time) ───────────────────────
-- Paste this into the SQL Editor whenever you want a quick snapshot:
/*
SELECT
  (SELECT COUNT(*) FROM messages)              AS total_messages,
  (SELECT COUNT(*) FROM conversations)         AS total_conversations,
  (SELECT COUNT(*) FROM rides)                 AS total_rides,
  (SELECT COUNT(*) FROM listings)              AS total_listings,
  (SELECT COUNT(*) FROM listings
   WHERE expires_at < NOW()
     AND status = 'active')                    AS expiring_listings,
  (SELECT COUNT(*) FROM listings
   WHERE deleted_at IS NOT NULL)               AS soft_deleted_listings;
*/

-- ── Done ─────────────────────────────────────────────────────────────────────
-- To verify cron jobs are registered:
-- SELECT * FROM cron.job;
