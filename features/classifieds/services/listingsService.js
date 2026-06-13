// features/classifieds/services/listingsService.js
// CLASSIFIEDS FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the listings table

import { supabase } from '../../../core/database/index';

export const PAGE_SIZE = 30;

// Strip characters that have meaning in PostgREST .or() filter strings and
// ilike patterns — raw user input must never alter the filter structure.
export function sanitizeSearchTerm(q) {
  return String(q || '').replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// ─── Fetch active listings (paginated) ─────────
// page 0 = first PAGE_SIZE rows. Screens append pages via onEndReached.
export async function getListings(category = null, page = 0) {
  let query = supabase
    .from('listings')
    .select('*')
    .in('status', ['active', 'out_of_stock'])
    .order('status', { ascending: true })   // 'active' sorts before 'out_of_stock' → in-stock first
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

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

// ─── Stock toggle (food listings) ──────────────
// Out of stock: hide from active browse (sinks to bottom), mark inactive, and
// stamp deleted_at so the existing 30-day hard-delete cron removes it if never
// restocked. Back in stock: clear deleted_at and renew for another 60 days.
export async function setListingStock(id, outOfStock) {
  let patch;
  if (outOfStock) {
    patch = { status: 'out_of_stock', is_active: false, deleted_at: new Date().toISOString() };
  } else {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);
    patch = { status: 'active', is_active: true, deleted_at: null, expires_at: expiresAt.toISOString() };
  }
  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Search listings ───────────────────────────
export async function searchListings(query, category = null) {
  const safe = sanitizeSearchTerm(query);
  if (!safe) return [];
  let dbQuery = supabase
    .from('listings')
    .select('*')
    .in('status', ['active', 'out_of_stock'])
    .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order('status', { ascending: true })
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

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