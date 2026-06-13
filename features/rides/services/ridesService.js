// features/rides/services/ridesService.js
// RIDES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the rides table
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';

export const PAGE_SIZE = 30;

// Strip ilike/filter metacharacters from user-typed search terms
function sanitizeSearchTerm(q) {
  return String(q || '').replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// Attach the poster profile (driver for offers, requester for requests) to each
// ride in one batched query — so cards/detail can show who & their rating.
async function attachPosters(rides) {
  if (!rides || rides.length === 0) return rides || [];
  const ids = [...new Set(rides.map(r => r.driver_id || r.requester_id).filter(Boolean))];
  if (ids.length === 0) return rides;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, driver_rating, driver_rating_count')
    .in('id', ids);

  const map = {};
  (profiles || []).forEach(p => { map[p.id] = p; });
  return rides.map(r => ({ ...r, poster: map[r.driver_id || r.requester_id] || null }));
}

// Fetch a single poster profile (used by the detail screen as a fallback).
export async function getRidePoster(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, driver_rating, driver_rating_count')
    .eq('id', userId)
    .maybeSingle();
  return data || null;
}

// ─── Fetch active rides (paginated) ────────────
// tab: null = all, 'offers' = driver offers, 'requests' = rider requests
export async function getRides(category = null, tab = null, university = null, page = 0) {
  let query = supabase
    .from('rides')
    .select('*')
    .eq('is_active', true)
    .gte('ride_date', new Date().toISOString())
    .order('ride_date', { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (tab === 'offers') query = query.eq('ride_type', 'offer');
  else if (tab === 'requests') query = query.eq('ride_type', 'request');

  if (category) query = query.eq('category', category);
  if (university) query = query.eq('university', university);

  const { data, error } = await query;
  if (error) throw error;
  return attachPosters(data);
}

// ─── Fetch single ride ─────────────────────────
export async function getRideById(id) {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ─── Create new ride ───────────────────────────
export async function createRide(ride) {
  const { data, error } = await supabase
    .from('rides')
    .insert(ride)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Update ride ───────────────────────────────
export async function updateRide(id, updates) {
  const { data, error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Delete ride ───────────────────────────────
export async function deleteRide(id) {
  const { error } = await supabase
    .from('rides')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ─── Search rides ──────────────────────────────
export async function searchRides(from, to) {
  let query = supabase
    .from('rides')
    .select('*')
    .eq('is_active', true)
    .gte('ride_date', new Date().toISOString())
    .order('ride_date', { ascending: true });

  const safeFrom = sanitizeSearchTerm(from);
  const safeTo = sanitizeSearchTerm(to);
  if (safeFrom) {
    query = query.ilike('from_location', `%${safeFrom}%`);
  }
  if (safeTo) {
    query = query.ilike('to_location', `%${safeTo}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return attachPosters(data);
}

// ─── Get user's own rides ──────────────────────
export async function getMyRides(userId) {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .or(`driver_id.eq.${userId},requester_id.eq.${userId}`)
    .order('ride_date', { ascending: true });

  if (error) throw error;
  return data;
}