// core/services/pointsService.js
// Points are awarded SERVER-SIDE ONLY (SECURITY DEFINER triggers in
// supabase/migrations/001_security_hardening.sql):
//   - post_listing / first_listing  → trigger on listings insert
//   - share_ride                    → trigger on rides insert
//   - sale_verified                 → trigger on sale_verifications update
//   - received_5star                → trigger on ratings insert
// The client only READS points. profiles.points is a protected column —
// direct client writes are reverted by trg_protect_profile_columns.

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

export async function getUserPoints(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .maybeSingle();
  return data?.points || 0;
}

// Re-read the current user's points after an action that earns them
// (the DB trigger has already credited the account by the time this runs).
export async function refreshMyPoints(userId) {
  if (!userId) return 0;
  const points = await getUserPoints(userId);
  const store = useAppStore.getState();
  if (store.user?.id === userId) store.setProfilePoints(points);
  return points;
}
