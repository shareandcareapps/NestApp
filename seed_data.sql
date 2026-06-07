-- NestApp Seed Data
-- Run this in your Supabase dashboard → SQL Editor
-- Uses raam's user_id: 61bc723f-2ee2-42e9-b6fa-8418147edac7
-- Uses sush's user_id: 94209b17-2eca-4720-b498-50c8ce35a1a7

-- ── LISTINGS ────────────────────────────────────────────────────────────────

INSERT INTO listings (user_id, title, description, price, city, state, category, images, status, is_boosted, metadata) VALUES

-- ACCOMMODATION
('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Private Room in Delmar Loop – $700/mo',
 'Fully furnished private room in a 3BR house near the Loop. Includes high-speed WiFi, washer/dryer, and parking. 10 min walk to MetroLink. Ideal for grad students or young professionals. Available July 1.',
 700, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"]'::jsonb,
 'active', false,
 '{"location": "University City, MO", "negotiable": false}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Studio Apartment – Clayton, $950/mo',
 'Modern studio in the heart of Clayton. Hardwood floors, in-unit laundry, gym access. 5 min walk to MetroLink Red Line. Utilities not included. Lease starting Aug 1.',
 950, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]'::jsonb,
 'active', true,
 '{"location": "Clayton, MO", "negotiable": true}'::jsonb),

('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 '2BR Apartment – Tower Grove, $1100/mo',
 'Spacious 2-bedroom near Tower Grove Park. Great for roommates. Hardwood floors, updated kitchen, street parking. Walking distance to restaurants and cafes.',
 1100, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]'::jsonb,
 'active', false,
 '{"location": "Tower Grove, St. Louis", "negotiable": true}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Single Room – Wash U Campus, $650/mo',
 'Cozy single room 3 minutes walk from Wash U south campus. Shared bathroom and kitchen. All utilities included. Quiet household, no parties. Available immediately.',
 650, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"]'::jsonb,
 'active', false,
 '{"location": "Clayton/Wash U, MO", "negotiable": false}'::jsonb),

-- JOBS
('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Software Engineer – Remote (STL-based)',
 'Local tech startup hiring a full-stack engineer. React + Node.js. 2+ years experience required. Salary $90k–$120k. H1B sponsorship available for qualified candidates.',
 95000, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"]'::jsonb,
 'active', false,
 '{"location": "Remote / St. Louis", "negotiable": false}'::jsonb),

('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Grocery Store Cashier – Part Time',
 'Desi Grocery on Manchester Rd hiring part-time cashier. Flexible hours, weekends OK. $14/hr. Hindi/Urdu speaking preferred but not required. Start immediately.',
 14, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"]'::jsonb,
 'active', false,
 '{"location": "Manchester Rd, St. Louis", "negotiable": false}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Halal Restaurant – Server/Cashier',
 'Popular halal restaurant in University City hiring full-time server/cashier. Experience in food service preferred. $15/hr + tips. Must be available on weekends.',
 15, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"]'::jsonb,
 'active', false,
 '{"location": "University City, MO", "negotiable": false}'::jsonb),

-- BUY/SELL
('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'iPhone 14 Pro – 256GB, Space Black',
 'Selling my iPhone 14 Pro 256GB Space Black. Used 8 months, excellent condition. No scratches, always in case. Comes with original box, charger, and 2 cases. Unlocked for all carriers.',
 780, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800"]'::jsonb,
 'active', true,
 '{"location": "Chesterfield, MO", "negotiable": true}'::jsonb),

('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'IKEA Study Desk + Chair – Like New',
 'IKEA MICKE desk (white, 105x50cm) with ALEX drawer unit and matching chair. Bought 6 months ago, relocating so must sell. Very good condition. Pickup only from Clayton.',
 120, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800"]'::jsonb,
 'active', false,
 '{"location": "Clayton, MO", "negotiable": true}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Instant Pot Duo 7-in-1 – 6 Quart',
 'Barely used Instant Pot Duo 6-quart. All accessories included. Great for daal, biryani, curries. Selling because I got a bigger one. Works perfectly. Pickup in Ballwin.',
 45, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1585325701956-60dd9c8bc4c7?w=800"]'::jsonb,
 'active', false,
 '{"location": "Ballwin, MO", "negotiable": false}'::jsonb),

('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Samsung 55" 4K Smart TV – $250',
 'Samsung 55-inch 4K UHD Smart TV (UN55TU8000). Purchased 2 years ago, no issues. Moving out and cannot take it. Remote included. Must pick up from Creve Coeur.',
 250, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=800"]'::jsonb,
 'active', false,
 '{"location": "Creve Coeur, MO", "negotiable": true}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Books – GRE Prep + Engineering Textbooks',
 'Selling GRE official prep books (2024 edition) and several CS/Engineering textbooks. All in good condition. $5–$25 each. Great for Wash U, SLU, or UMSL students. Pickup in U-City.',
 15, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800"]'::jsonb,
 'active', false,
 '{"location": "University City, MO", "negotiable": true}'::jsonb),

-- FOOD
('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Homemade Biryani Tiffin Service – Fri & Sun',
 'Authentic Hyderabadi chicken biryani tiffin. Cooked fresh every Friday and Sunday. $12 per box (2 servings). Order by Thursday night. Pickup in Maryland Heights or delivery within 5 miles.',
 12, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"]'::jsonb,
 'active', false,
 '{"location": "Maryland Heights, MO", "negotiable": false}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Pakistani Home-Cooked Meals – Weekly Box',
 'Weekly home-cooked Pakistani meals. Menu rotates: karahi, nihari, daal, pulao. Full meal $10 includes rice/roti. Serving Creve Coeur and surrounding areas. DM to subscribe.',
 10, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800"]'::jsonb,
 'active', false,
 '{"location": "Creve Coeur, MO", "negotiable": false}'::jsonb),

('61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Nepali Momos – Fresh Every Saturday',
 'Handmade Nepali chicken and veggie momos. $8 for 10 pieces with chutney. Made fresh every Saturday morning. Pickup in University City. Pre-order by Friday 9 PM. Limited quantity.',
 8, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800"]'::jsonb,
 'active', false,
 '{"location": "University City, MO", "negotiable": false}'::jsonb),

('94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Arabic Sweets & Baklava – Order Now',
 'Homemade Arabic baklava, kunafa, and assorted sweets. Perfect for Eid, parties, or gifting. Box of 12 pieces – $18. Custom orders welcome. Made in Florissant. Free delivery in North County.',
 18, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800"]'::jsonb,
 'active', false,
 '{"location": "Florissant, MO", "negotiable": false}'::jsonb);


-- ── RIDES ───────────────────────────────────────────────────────────────────

INSERT INTO rides (driver_id, requester_id, from_location, to_location, ride_date, seats_available, cost_share, category, notes, status, ride_type, university, any_time) VALUES

-- AIRPORT RIDES
('61bc723f-2ee2-42e9-b6fa-8418147edac7', NULL,
 'University City', 'Lambert Airport (STL)',
 '2026-06-20 05:30:00+00', 3, 10,
 'airport', 'Leaving early morning, 5:30 AM departure. Can pick up along Delmar Blvd route.',
 'active', 'offer', NULL, false),

('94209b17-2eca-4720-b498-50c8ce35a1a7', NULL,
 'Chesterfield', 'Lambert Airport (STL)',
 '2026-06-22 14:00:00+00', 2, 12,
 'airport', 'Afternoon drop. Heading to Terminal 1. Luggage space available.',
 'active', 'offer', NULL, false),

(NULL, '61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'Clayton', 'Lambert Airport (STL)',
 '2026-06-18 08:00:00+00', 1, 0,
 'airport', 'Looking for a ride to airport on the 18th, morning flight. Happy to share gas cost.',
 'active', 'request', NULL, false),

-- UNIVERSITY RIDES
('94209b17-2eca-4720-b498-50c8ce35a1a7', NULL,
 'Chesterfield', 'Washington University',
 '2026-06-10 08:00:00+00', 3, 5,
 'university', 'Daily commute to Wash U. Monday-Friday, leaving at 8 AM. Happy to carpool regularly.',
 'active', 'offer', 'washu', false),

('61bc723f-2ee2-42e9-b6fa-8418147edac7', NULL,
 'Maryland Heights', 'UMSL North Campus',
 '2026-06-11 09:00:00+00', 2, 4,
 'university', 'Going to UMSL for summer semester. Can pick up from 270/270 area.',
 'active', 'offer', 'umsl', false),

(NULL, '94209b17-2eca-4720-b498-50c8ce35a1a7',
 'Florissant', 'St. Louis University',
 '2026-06-12 07:30:00+00', 1, 0,
 'university', 'Need a ride to SLU med campus. Flexible on timing, any morning works.',
 'active', 'request', 'slu', false),

-- REGULAR / COMMUTE RIDES
('61bc723f-2ee2-42e9-b6fa-8418147edac7', NULL,
 'Creve Coeur', 'Downtown St. Louis',
 '2026-06-15 08:30:00+00', 2, 6,
 'regular', 'Daily work commute downtown. I-64 route. Leaving at 8:30 AM, returning ~6 PM.',
 'active', 'offer', NULL, false),

('94209b17-2eca-4720-b498-50c8ce35a1a7', NULL,
 'Ballwin', 'Chesterfield Valley',
 '2026-06-16 09:00:00+00', 3, 4,
 'regular', 'Heading to Chesterfield for grocery shopping and errands. Anyone welcome to join.',
 'active', 'offer', NULL, false),

(NULL, '61bc723f-2ee2-42e9-b6fa-8418147edac7',
 'University City', 'West County Mall',
 '2026-06-21 12:00:00+00', 1, 0,
 'regular', 'Looking for a ride to West County Mall this Saturday afternoon. Can Venmo for gas.',
 'active', 'request', NULL, false);

-- ── FIX RIDE DATES (run this to push all rides into the future) ─────────────
-- Updates all rides so ride_date = now + original offset from creation date
UPDATE rides SET ride_date = NOW() + (ride_date - created_at) WHERE is_active = true;

-- If the above doesn't work, just set all active rides to upcoming dates:
-- UPDATE rides SET ride_date = NOW() + interval '3 days' WHERE is_active = true;
