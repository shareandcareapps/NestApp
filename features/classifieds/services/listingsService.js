// features/classifieds/services/listingsService.js
// CLASSIFIEDS FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the listings table

import { supabase } from '../../../core/database/index';

// ─── Fetch all active listings ─────────────────
export async function getListings(category = null) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch profiles separately for each listing
  if (data && data.length > 0) {
    const enriched = await Promise.all(
      data.map(async (listing) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', listing.user_id)
          .single();
        return { ...listing, poster: profile };
      })
    );
    return enriched;
  }

  return data;
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
  const { data, error } = await supabase
    .from('listings')
    .insert({
      ...listing,
      is_active: true,
      is_boosted: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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

// ─── Delete listing ────────────────────────────
export async function deleteListing(id) {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ─── Search listings ───────────────────────────
export async function searchListings(query, category = null) {
  let dbQuery = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
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
    .select('id, full_name, username, avatar_url')
    .eq('id', userId)
    .single();
    
  if (error) return null;
  return data;
}