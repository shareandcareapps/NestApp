import { supabase } from '../database/index';
import useAppStore from '../store/index';

export const POINT_VALUES = {
  post_listing: 5,
  first_listing: 20,
  share_ride: 10,
  complete_ride: 15,
  sale_verified: 10,
  received_5star: 5,
};

export const TIERS = [
  { min: 0,   label: 'New Member',      badge: '🌱' },
  { min: 50,  label: 'Active',          badge: '⭐' },
  { min: 150, label: 'Trusted',         badge: '🏅' },
  { min: 300, label: 'Community Star',  badge: '🌟' },
];

export function getTier(points = 0) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

export async function awardPoints(userId, action, referenceId = null) {
  const points = POINT_VALUES[action];
  if (!points) return;

  const { error: txErr } = await supabase
    .from('point_transactions')
    .insert({ user_id: userId, points, action, reference_id: referenceId });
  if (txErr) { console.error('point_transactions insert:', txErr); return; }

  const { error: updateErr } = await supabase.rpc('increment_points', {
    uid: userId,
    amount: points,
  });
  if (updateErr) {
    const { data } = await supabase.from('profiles').select('points').eq('id', userId).single();
    await supabase.from('profiles').update({ points: (data?.points || 0) + points }).eq('id', userId);
  }

  // Update store instantly if awarding to the current user
  const store = useAppStore.getState();
  if (store.user?.id === userId) {
    store.setProfilePoints((store.profilePoints ?? 0) + points);
  }
}

export async function getUserPoints(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .maybeSingle();
  return data?.points || 0;
}
