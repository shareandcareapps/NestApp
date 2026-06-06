import { supabase } from '../database/index';

// The buyer/rider only inserts the rating row (which it's allowed to write).
// A DB trigger recalculates the rated user's aggregate and awards the 5★ bonus
// — all as SECURITY DEFINER, so the client never writes another user's profile.
export async function submitRating({ fromUserId, toUserId, type, referenceId, rating, comment }) {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, type, reference_id: referenceId, rating, comment })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function hasRated({ fromUserId, referenceId, type }) {
  const { data } = await supabase
    .from('ratings')
    .select('id')
    .eq('from_user_id', fromUserId)
    .eq('reference_id', referenceId)
    .eq('type', type)
    .maybeSingle();
  return !!data;
}

export async function getPublicProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, points, seller_rating, seller_rating_count, driver_rating, driver_rating_count, created_at, city')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;

  const { count: listingCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { count: rideCount } = await supabase
    .from('rides')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return { ...data, listingCount: listingCount || 0, rideCount: rideCount || 0 };
}
