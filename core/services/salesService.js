// core/services/salesService.js
// Cross-cutting marketplace sale lifecycle — sale_verifications table.
// Handles the "mark sold → buyer confirms → seller earns points" flow.

import { supabase } from '../database/index';

// Create (or replace) a pending purchase verification for a listing.
// One verification per listing (UNIQUE listing_id) — re-marking overwrites.
export async function createSaleVerification({ listingId, sellerId, buyerId, listingTitle, listingImage, listingPrice }) {
  const { data, error } = await supabase
    .from('sale_verifications')
    .upsert(
      {
        listing_id: listingId,
        seller_id: sellerId,
        buyer_id: buyerId,
        status: 'pending',
        listing_title: listingTitle,
        listing_image: listingImage,
        listing_price: listingPrice,
      },
      { onConflict: 'listing_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// The single pending verification awaiting THIS user's confirmation (as buyer).
export async function getPendingVerificationForBuyer(buyerId) {
  const { data } = await supabase
    .from('sale_verifications')
    .select('*, listing:listings(id, title, images, price), seller:profiles!sale_verifications_seller_id_fkey(id, username)')
    .eq('buyer_id', buyerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .maybeSingle();
  if (!data) return null;

  // Prefer the live listing (now readable via RLS); fall back to the snapshot
  const title = data.listing?.title || data.listing_title || 'Item';
  const image = data.listing?.images?.[0] || data.listing_image || null;
  const price = data.listing?.price ?? data.listing_price ?? null;
  return { ...data, displayTitle: title, displayImage: image, displayPrice: price };
}

// Buyer confirms or disputes. The buyer only updates the status (a row it's
// allowed to write); a DB trigger awards the seller points on 'verified'.
export async function resolveVerification(verification, verified) {
  const { error } = await supabase
    .from('sale_verifications')
    .update({ status: verified ? 'verified' : 'disputed' })
    .eq('id', verification.id);
  if (error) throw error;
}
