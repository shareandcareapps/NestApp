// features/classifieds/services/listingsService.js
// CLASSIFIEDS FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the listings table

import { supabase } from '../../../core/database/index';

// ─── Fetch all active listings ─────────────────
export async function getListings(category = null) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Batch fetch all unique profiles in a single query
  const userIds = [...new Set(data.map(l => l.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, seller_rating, seller_rating_count')
    .in('id', userIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  return data.map(listing => ({ ...listing, poster: profileMap[listing.user_id] || null }));
}

// ─── Fetch single listing ──────────────────────
export async function getListingById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ─── Create new listing ────────────────────────
export async function createListing(listing) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  const { data, error } = await supabase
    .from('listings')
    .insert({
      ...listing,
      status: 'active',
      is_active: true,
      is_boosted: false,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Listing lifecycle ─────────────────────────
// 'active' (live) | 'sold' (sold, archived) | 'archived' (manually hidden)
// Keeps is_active in sync so any legacy reads still behave.
export async function setListingStatus(id, status) {
  const { data, error } = await supabase
    .from('listings')
    .update({ status, is_active: status === 'active' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Fetch the current user's listings (all statuses) ──
export async function getMyListings(userId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Update listing ────────────────────────────
export async function updateListing(id, updates) {
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Soft-delete listing ───────────────────────
// Sets deleted_at — pg_cron hard-deletes after 30 days.
export async function deleteListing(id) {
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString(), status: 'archived', is_active: false })
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ─── Renew listing ─────────────────────────────
// Resets expires_at to 60 days from now and re-activates.
export async function renewListing(id) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  const { data, error } = await supabase
    .from('listings')
    .update({ expires_at: expiresAt.toISOString(), status: 'active', is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Search listings ───────────────────────────
export async function searchListings(query, category = null) {
  let dbQuery = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data;
}

// ─── Fetch profile for a user ──────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, seller_rating, seller_rating_count')
    .eq('id', userId)
    .single();
    
  if (error) return null;
  return data;
}