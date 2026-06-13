/**
 * delete-account — Supabase Edge Function
 *
 * Deletes the calling user's account and ALL of their data:
 *   1. Conversations they participate in (+ messages, reactions)
 *   2. Ride bookings, ratings, sale verifications, reports, blocks,
 *      point transactions, feedback (anonymized)
 *   3. Listings and rides (hard delete — profile is going away)
 *   4. Storage objects they uploaded
 *   5. The Supabase Auth user, then the profile row
 *
 * The function authenticates the caller from the Authorization header,
 * so only the user themselves can delete their own account.
 *
 * Deploy: supabase functions deploy delete-account
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: CORS_HEADERS });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
  }

  const userId = user.id;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Conversations the user participates in — messages, reactions, threads.
    //    Full account deletion removes the whole thread (the user's words are
    //    their personal data; a one-sided thread is useless to the other party).
    const { data: convs } = await admin
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);

    if (convIds.length > 0) {
      const { data: msgs } = await admin.from('messages').select('id').in('conversation_id', convIds);
      const msgIds = (msgs ?? []).map((m: { id: string }) => m.id);
      if (msgIds.length > 0) {
        await admin.from('message_reactions').delete().in('message_id', msgIds);
      }
      await admin.from('messages').delete().in('conversation_id', convIds);
      await admin.from('conversations').delete().in('id', convIds);
    }
    // Stray reactions the user left in other threads
    await admin.from('message_reactions').delete().eq('user_id', userId);

    // 2. Relational data
    await admin.from('ride_bookings').delete().or(`rider_id.eq.${userId},driver_id.eq.${userId}`);
    await admin.from('sale_verifications').delete().or(`seller_id.eq.${userId},buyer_id.eq.${userId}`);
    await admin.from('ratings').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await admin.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await admin.from('reports').delete().eq('reporter_id', userId);
    await admin.from('point_transactions').delete().eq('user_id', userId);
    // Feedback is anonymized (kept for product insight), FK is ON DELETE SET NULL
    await admin.from('feedback').update({ user_id: null }).eq('user_id', userId);

    // 3. Listings and rides — hard delete (account is gone, no broken cards)
    await admin.from('listings').delete().eq('user_id', userId);
    await admin.from('rides').delete().or(`driver_id.eq.${userId},requester_id.eq.${userId}`);

    // 4. Storage: remove everything the user uploaded (best-effort).
    //    Listing images live under `${userId}/...`; also sweep by owner.
    try {
      const { data: objects } = await admin
        .schema('storage')
        .from('objects')
        .select('name, bucket_id')
        .eq('owner', userId);
      const byBucket: Record<string, string[]> = {};
      for (const o of objects ?? []) {
        (byBucket[o.bucket_id] ??= []).push(o.name);
      }
      for (const [bucket, names] of Object.entries(byBucket)) {
        for (let i = 0; i < names.length; i += 100) {
          await admin.storage.from(bucket).remove(names.slice(i, i + 100));
        }
      }
    } catch (storageErr) {
      console.error('storage cleanup (non-fatal):', storageErr);
    }

    // 5. Auth user FIRST — if this fails we abort and the user can retry with
    //    an intact profile (no half-deleted login-able account).
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    // Profile last (or via FK cascade from auth.users if configured)
    await admin.from('profiles').delete().eq('id', userId);

    return new Response(JSON.stringify({ success: true }), { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('delete-account error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: CORS_HEADERS });
  }
});
