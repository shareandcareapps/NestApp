// features/rides/services/ridesService.js
// RIDES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the rides table
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';

// ─── Fetch all active rides ────────────────────
// tab: null = all, 'offers' = driver offers, 'requests' = rider requests
export async function getRides(category = null, tab = null, university = null) {
  let query = supabase
    .from('rides')
    .select('*')
    .eq('is_active', true)
    .gte('ride_date', new Date().toISOString())
    .order('ride_date', { ascending: true });

  if (tab === 'offers') query = query.eq('ride_type', 'offer');
  else if (tab === 'requests') query = query.eq('ride_type', 'request');

  if (category) query = query.eq('category', category);
  if (university) query = query.eq('university', university);

  const { data, error } = await query;
  if (error) throw error;
  return data;
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

  if (from) {
    query = query.ilike('from_location', `%${from}%`);
  }
  if (to) {
    query = query.ilike('to_location', `%${to}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
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