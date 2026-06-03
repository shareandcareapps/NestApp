// features/classifieds/services/listingsService.js
// CLASSIFIEDS FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the listings table
// No other feature should ever import this file

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
  return data;
}

// ─── Fetch single listing ──────────────────────
export async function getListingById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      profiles (
        full_name,
        phone,
        avatar_url
      )
    `)
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
    .select(`*`)
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