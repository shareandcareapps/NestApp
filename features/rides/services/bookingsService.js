// features/rides/services/bookingsService.js
// Ride booking + Ride Day check-in data layer.
// All ride_bookings table access lives here.

import { supabase } from '../../../core/database/index';

// ─── Create or return existing booking ────────────────────────────────────────
// Idempotent: calling twice for the same rider+ride is safe.
export async function createBooking(rideId, riderId, driverId) {
  const { data: existing } = await supabase
    .from('ride_bookings')
    .select('id, status')
    .eq('ride_id', rideId)
    .eq('rider_id', riderId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('ride_bookings')
    .insert({ ride_id: rideId, rider_id: riderId, driver_id: driverId, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── All bookings for a ride (driver view) ────────────────────────────────────
// Returns bookings with riderProfile attached. Excludes cancelled.
export async function getBookingsForRide(rideId) {
  const { data, error } = await supabase
    .from('ride_bookings')
    .select('*')
    .eq('ride_id', rideId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const riderIds = [...new Set(data.map(b => b.rider_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', riderIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  return data.map(b => ({ ...b, riderProfile: profileMap[b.rider_id] || null }));
}

// ─── Get the current user's booking for a ride (rider view) ──────────────────
export async function getMyBooking(rideId, riderId) {
  const { data } = await supabase
    .from('ride_bookings')
    .select('*')
    .eq('ride_id', rideId)
    .eq('rider_id', riderId)
    .neq('status', 'cancelled')
    .maybeSingle();

  return data || null;
}

// ─── Driver confirms a booking ────────────────────────────────────────────────
// Server-side RPC: verifies the caller is the driver, enforces seat capacity
// atomically (FOR UPDATE), and keeps rides.seats_booked in sync — no client
// status writes, no overbooking races.
export async function confirmBooking(bookingId, _rideId) {
  const { data, error } = await supabase.rpc('confirm_ride_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return data;
}

// ─── Driver declines / rider cancels a booking ───────────────────────────────
export async function cancelBooking(bookingId, _rideId) {
  const { error } = await supabase.rpc('cancel_ride_booking', { p_booking_id: bookingId });
  if (error) throw error;
}

// ─── Fetch a single booking by ID ────────────────────────────────────────────
export async function getBookingById(bookingId) {
  const { data } = await supabase
    .from('ride_bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();
  return data || null;
}

// ─── Rider checks in on ride day ──────────────────────────────────────────────
// status: 'on_my_way' — RPC verifies the caller is the rider.
export async function updateCheckinStatus(bookingId, status) {
  const { error } = await supabase.rpc('set_booking_checkin', {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) throw error;
}
