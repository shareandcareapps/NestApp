/**
 * delete-account — Supabase Edge Function
 *
 * Deletes the calling user's account entirely:
 *   1. Soft-deletes all their listings and rides
 *   2. Deletes their profile row
 *   3. Deletes the Supabase Auth user (requires service role)
 *
 * Environment variables (auto-provided by Supabase runtime):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Called from the app via:
 *   supabase.functions.invoke('delete-account')
 *
 * The function authenticates the caller from the Authorization header,
 * so only the user themselves can delete their own account.
 *
 * Deploy: supabase functions deploy delete-account
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
  }

  // Use user-scoped client to verify the JWT and get the user id
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = user.id;

  // Service-role client for privileged operations
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Remove the user from any active conversations (don't delete messages — other party needs them)
    // We just null out their participant reference by deleting blocked_users / reports for them
    await admin.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await admin.from('reports').delete().eq('reporter_id', userId);

    // 2. Deactivate listings and rides (soft delete so the marketplace doesn't show broken cards)
    await admin.from('listings').update({ status: 'deleted' }).eq('user_id', userId);
    await admin.from('rides').update({ is_active: false }).eq('user_id', userId);

    // 3. Delete profile (cascade will clean up points_log etc. if FK exists)
    await admin.from('profiles').delete().eq('id', userId);

    // 4. Delete the auth user — this is the step the client SDK cannot do
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('delete-account error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
