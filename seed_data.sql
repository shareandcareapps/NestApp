-- ============================================================================
-- NestApp Seed Data v2 - realistic St. Louis community listings + rides
-- Run this whole file in Supabase dashboard -> SQL Editor.
--
-- - Wipes the OLD seed/fake listings & rides (and their chats) for a clean slate.
-- - Inserts 10 listings per market category (Housing, Jobs, Buy & Sell, Food)
--   and a full set of carpool rides across every category.
-- - Posts are assigned to RANDOM existing profiles so they look like genuine
--   posts from different community members.
-- - Images use Unsplash URLs - if any don't load, just swap the URL.
--
--   The cleanup section also deletes listing/ride CHATS. If you want to keep
--     existing conversations, comment out the DELETE lines under "CLEANUP".
-- ============================================================================

BEGIN;

-- ⚠️ DESTRUCTIVE SAFETY GUARD ⚠️
-- This script WIPES all listings, rides, bookings and listing/ride chats.
-- It refuses to run unless you explicitly opt in for this session:
--   SET app.allow_seed = 'yes-wipe-data';
-- Never run this against a database with real user content.
DO $$
BEGIN
  IF current_setting('app.allow_seed', true) IS DISTINCT FROM 'yes-wipe-data' THEN
    RAISE EXCEPTION
      'Seed blocked: this wipes ALL listings/rides/chats. If you are SURE this is a dev database, first run:  SET app.allow_seed = ''yes-wipe-data'';';
  END IF;
END $$;

-- -- CLEANUP -----------------------------------------------------------------
DELETE FROM ride_bookings;
DELETE FROM sale_verifications;
DELETE FROM messages
  WHERE conversation_id IN (
    SELECT id FROM conversations
    WHERE listing_id IS NOT NULL OR listing_title LIKE '%' || chr(8594) || '%'
  );
DELETE FROM conversations
  WHERE listing_id IS NOT NULL OR listing_title LIKE '%' || chr(8594) || '%';
DELETE FROM listings;
DELETE FROM rides;

-- ============================================================================
-- LISTINGS
-- columns: user_id, title, description, price, city, state, category, images,
--          status, is_active, is_boosted, expires_at, metadata
-- ============================================================================
INSERT INTO listings (user_id, title, description, price, city, state, category, images, status, is_active, is_boosted, expires_at, metadata) VALUES

-- --------------- HOUSING (accommodation) ---------------
((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Private room near Wash U - $700/mo, utilities included',
 'Furnished private room in a clean 3BR house, 10 min walk to Wash U south campus. High-speed WiFi, in-unit washer/dryer, off-street parking. Vegetarian-friendly kitchen, quiet housemates. Available July 1. Text for a tour ',
 700, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"location": "University City, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Studio apartment in Clayton - $980/mo',
 'Modern studio in the heart of Clayton. Hardwood floors, stainless appliances, gym + rooftop access. 5 min to MetroLink. Perfect for a working professional. Lease starts Aug 1, utilities extra.',
 980, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"location": "Clayton, MO", "negotiable": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 '2BHK in Ballwin, great for roommates - $1250/mo',
 'Spacious 2 bed / 2 bath in Ballwin near Indian grocery stores and temple. Updated kitchen, big closets, assigned parking. Looking for 2 working professionals or grad students. Available mid-July.',
 1250, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Ballwin, MO", "negotiable": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Single room available - Creve Coeur, $600',
 'Cozy room in a friendly desi household near Creve Coeur. All utilities + WiFi included. Shared kitchen and bath. No smoking, no parties. Walking distance to bus stop. Available now.',
 600, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Creve Coeur, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Looking for 1 roommate - Maryland Heights apt',
 'Have an extra room in a 2BR apartment, $525/mo + split utilities (~$60). Looking for a clean, vegetarian-friendly roommate. Close to Edward Jones campus. Available from August.',
 525, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Maryland Heights, MO", "negotiable": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Sublease May-Aug, Central West End - $850',
 'Summer sublease in a beautiful CWE 1BR. Fully furnished, walk to BJC/SLU medical campus. Cats ok. Flexible on dates. Great for a summer intern or rotating student.',
 850, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Central West End, St. Louis", "negotiable": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Room in Chesterfield house - $675 all incl.',
 'Big bright room in a quiet Chesterfield neighborhood. All utilities, WiFi, and laundry included. Family environment, home-cooked food can be arranged. Near Chesterfield Mall & Costco.',
 675, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Chesterfield, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 '1BR near SLU campus - $790/mo',
 'One bedroom apartment 6 min walk from SLU. Controlled entry, on-site laundry, water included. Ideal for SLU grad/PhD students. Available for fall semester.',
 790, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Midtown / SLU, St. Louis"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Shared room for student - $400/mo',
 'Affordable shared room for a student, near UMSL. All utilities included, friendly housemates, close to MetroLink North. Great budget option for new students arriving for fall.',
 400, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Normandy / UMSL, MO", "negotiable": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Furnished 1BR - Olivette, move-in ready $900',
 'Quiet furnished 1BR in Olivette, close to Olive Blvd Indian shops & restaurants. Comes with bed, sofa, dining set. Heat & water included. 12-month lease preferred. Available August 1.',
 900, 'St. Louis', 'Missouri', 'accommodation',
 '["https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"location": "Olivette, MO", "negotiable": false}'::jsonb),

-- --------------- JOBS ---------------
((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Part-time cashier - Indian grocery (Manchester Rd)',
 'Desi grocery store hiring a part-time cashier. Flexible hours, weekends a plus. $14/hr cash + store discount. Hindi/Telugu/Gujarati a bonus but not required. Start immediately.',
 14, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Spice Bazaar", "job_type": "part_time", "hours_per_week": "20", "location": "Manchester Rd, St. Louis", "joining": "immediate", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Line cook / kitchen helper - Indian restaurant',
 'Busy Indian restaurant in Chesterfield needs a kitchen helper / line cook. Full time, $16-$18/hr based on experience. Tandoor experience preferred. Meals provided. Immediate start.',
 17, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"company": "Saffron Indian Kitchen", "job_type": "full_time", "hours_per_week": "40", "location": "Chesterfield, MO", "joining": "immediate", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Math & Science tutor (part-time, evenings)',
 'Tutoring center in West County hiring tutors for middle/high school math and science. $20-$25/hr. Evenings & weekends. Great for grad students. Must be patient and good with kids.',
 22, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "BrightMinds Learning", "job_type": "part_time", "hours_per_week": "15", "location": "Ballwin, MO", "joining": "flexible", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Front desk associate - hotel (weekends)',
 'Hotel near the airport needs weekend front desk staff. $15/hr, training provided. Good English communication required. Reliable transport needed. Great first job for students.',
 15, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Gateway Inn & Suites", "job_type": "part_time", "hours_per_week": "16", "location": "Berkeley, MO", "joining": "immediate", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Software Engineer (Full-stack) - STL startup',
 'Local SaaS startup hiring a full-stack engineer. React + Node.js, 2+ yrs exp. $95k-$120k. Hybrid (3 days in Cortex). Visa transfer possible for the right candidate.',
 105000, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Confidential (Cortex)", "job_type": "full_time", "hours_per_week": "40", "location": "Cortex, St. Louis", "joining": "flexible", "salary_open": true}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Babysitter / nanny needed - weekdays',
 'Family in Creve Coeur looking for a caring babysitter for a 3-year-old, Mon-Fri 9am-2pm. $15/hr. Light meal prep. References required. Vegetarian household preferred.',
 15, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Private family", "job_type": "part_time", "hours_per_week": "25", "location": "Creve Coeur, MO", "joining": "flexible", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Delivery driver - evenings & weekends',
 'Restaurant group needs delivery drivers with own car. $13/hr + tips + mileage. Flexible shifts, mostly dinner rush. Make $200+ on a good weekend. Valid license + insurance required.',
 13, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Curry Express", "job_type": "part_time", "hours_per_week": "18", "location": "Maryland Heights, MO", "joining": "immediate", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Accounting assistant (entry level)',
 'CPA firm in Clayton hiring an entry-level accounting assistant. Full time, $42k-$48k + benefits. QuickBooks helpful. Great for recent accounting/finance grads on OPT.',
 45000, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Hartmann & Associates", "job_type": "full_time", "hours_per_week": "40", "location": "Clayton, MO", "joining": "flexible", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Weekend sales associate - clothing boutique',
 'Indian ethnic-wear boutique hiring weekend sales help for wedding season. $13/hr + commission. Must love fashion and talking to customers. Saree/lehenga knowledge a plus!',
 13, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "Rangoli Boutique", "job_type": "part_time", "hours_per_week": "12", "location": "St. Peters, MO", "joining": "immediate", "salary_open": false}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Warehouse associate - full time, day shift',
 'Distribution center hiring warehouse associates. $17.50/hr, day shift, weekly pay. No experience needed, will train. Steady hours, overtime available. Near Earth City.',
 17, 'St. Louis', 'Missouri', 'jobs',
 '["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"company": "MidWest Logistics", "job_type": "full_time", "hours_per_week": "40", "location": "Earth City, MO", "joining": "immediate", "salary_open": false}'::jsonb),

-- --------------- BUY & SELL ---------------
((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Samsung 55" 4K Smart TV - like new',
 'Selling my Samsung 55" 4K UHD Smart TV, barely used (moved to a bigger one). No scratches, remote + box included. Works perfectly. Pickup from Ballwin. Cash preferred.',
 250, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"product_category": "Electronics", "condition": "used", "negotiable": true, "pickup_location": "Ballwin, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'IKEA dining table + 4 chairs',
 'White IKEA dining set, good condition, small wear on one chair. Moving out sale. Must pick up from Chesterfield this weekend. Great starter furniture for a new apartment.',
 90, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1617104678098-de229db51175?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Furniture", "condition": "used", "negotiable": true, "pickup_location": "Chesterfield, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Queen bed + mattress (1 yr old)',
 'Queen size bed frame with mattress, only 1 year old, very clean (no stains, non-smoking home). Selling because relocating. Mattress is medium-firm. Disassembled for easy transport.',
 180, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Furniture", "condition": "used", "negotiable": true, "pickup_location": "Maryland Heights, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'MacBook Air M1 (2020) - 8GB/256GB',
 'MacBook Air M1, space gray, 256GB. Battery health 91%. Light scratches on bottom, screen flawless. Comes with charger. Great laptop for students. Reason: upgraded to M3.',
 520, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Electronics", "condition": "used", "negotiable": true, "pickup_location": "Clayton, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Honda Civic 2016 - 78k miles, clean title',
 'Selling my reliable 2016 Honda Civic LX. 78k miles, clean title, no accidents, new tires & brakes. Great on gas. Well maintained, all records available. Serious buyers only.',
 12500, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"product_category": "Cars", "condition": "used", "negotiable": true, "pickup_location": "Ballwin, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Kids tricycle + toys bundle',
 'Bundle of toddler toys + a sturdy tricycle. All cleaned and in good shape. Perfect for ages 2-4. Selling as a set only. Pickup from Creve Coeur. Great deal for the whole lot!',
 35, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1558877385-09c5b80e2f81?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Toys & Games", "condition": "used", "negotiable": false, "pickup_location": "Creve Coeur, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Microwave + Instant Pot combo',
 'Moving sale! Panasonic microwave and a 6qt Instant Pot Duo. Both work great, lightly used. Perfect for a new kitchen. Can sell separately ($25 microwave / $40 Instant Pot).',
 55, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1585515320310-259814833e62?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Appliances", "condition": "used", "negotiable": true, "pickup_location": "Olivette, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Bicycle - Trek hybrid, medium frame',
 'Trek FX hybrid bike, medium frame, great for commuting around the Loop/Forest Park. Tuned up recently, new tubes. Lock + lights included. Smooth ride, barely used last year.',
 160, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Other", "condition": "used", "negotiable": true, "pickup_location": "University City, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Office desk + ergonomic chair',
 'Work-from-home setup: sturdy office desk + ergonomic mesh chair. Both in excellent condition. Selling together. Great for students or remote workers. Pickup from Chesterfield.',
 110, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Furniture", "condition": "used", "negotiable": true, "pickup_location": "Chesterfield, MO"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Brand new winter jackets (size M & L)',
 'Two brand new winter jackets, never worn (wrong size gift). One M, one L, both black. Warm & waterproof, tags on. Perfect for STL winters. $45 each or $80 for both.',
 45, 'St. Louis', 'Missouri', 'buysell',
 '["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"product_category": "Clothing & Apparel", "condition": "new", "negotiable": false, "pickup_location": "St. Peters, MO"}'::jsonb),

-- --------------- FOOD ---------------
((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Homemade veg tiffin service - Mon to Fri',
 'Fresh home-cooked vegetarian tiffin delivered daily. 3 rotis, sabzi, dal, rice & salad. North Indian style, less oil, customizable spice. $9/day or $40/week. Pickup or delivery in West County.',
 9, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"business_name": "Anita''s Home Kitchen", "allergens": "Contains dairy (ghee, paneer), wheat. Prepared in a kitchen that also handles nuts.", "pickup": true, "delivery": true, "negotiable": false, "attested": true, "attested_at": "2026-06-10T18:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Weekend Hyderabadi biryani - order by Friday',
 'Authentic dum-style chicken & veg biryani made fresh every weekend. Family recipe, served with raita & mirchi ka salan. $12/portion. Order by Friday for Sat/Sun pickup in Ballwin.',
 12, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"]'::jsonb,
 'active', true, true, now() + interval '60 days',
 '{"business_name": "Hyderabad House (home)", "allergens": "Contains dairy, may contain nuts and bone (chicken). Made in a home kitchen.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-09T16:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Fresh dosas & idli - weekend breakfast',
 'Crispy dosas, soft idlis, with sambar & 3 chutneys. South Indian breakfast made to order on weekends. $8/plate. Pickup in Creve Coeur. Batter is fresh-ground, no preservatives.',
 8, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1630383249896-424e482df921?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Lakshmi''s Tiffins", "allergens": "Contains dairy (ghee). Gluten-free batter. Prepared at home.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-08T14:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Catering for parties - 20 to 100 guests',
 'Full Indian catering for birthdays, pujas & get-togethers. Veg & non-veg menus, starters to dessert. Booked 1 week in advance. Tasting available. Per-plate pricing from $14. Serving all of STL metro.',
 14, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1555244162-803834f70033?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Spice Route Catering", "allergens": "Various dishes contain dairy, nuts, gluten. Ask for specific dish allergens when ordering.", "pickup": true, "delivery": true, "negotiable": true, "attested": true, "attested_at": "2026-06-07T12:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Homemade sweets for Raksha Bandhan',
 'Taking orders for fresh mithai - kaju katli, besan ladoo, motichoor, soan papdi. Made to order, no artificial colors. Boxes from $15. Order 3 days ahead. Pickup in Chesterfield.',
 15, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Meena''s Mithai", "allergens": "Contains nuts (cashew, almond), dairy, chickpea flour. Made in a home kitchen with nuts.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-06T10:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Punjabi homestyle thali - lunch delivery',
 'Hearty Punjabi thali: dal makhani, seasonal sabzi, 2 butter rotis, rice, raita & pickle. $11/thali. Lunch delivery to West County offices. Order before 10am for same-day.',
 11, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1626500155537-89c4b1c98e87?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Punjab da Dhaba (home)", "allergens": "Contains dairy (butter, cream), gluten. Prepared in a home kitchen.", "pickup": true, "delivery": true, "negotiable": false, "attested": true, "attested_at": "2026-06-05T09:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Gujarati snacks - dhokla, thepla, fafda',
 'Fresh Gujarati farsan made weekly: khaman dhokla, methi thepla, fafda-jalebi. Perfect for tea time. $7-$10 per box. Pickup in Ballwin on weekends. Pure veg, Jain options available.',
 8, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Falguni''s Farsan", "allergens": "Contains chickpea flour, wheat, mustard, sesame. Jain (no onion/garlic) on request.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-04T11:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Fresh paneer & dahi - made to order',
 'Homemade soft paneer and thick dahi (yogurt), no preservatives. Paneer $7/lb, dahi $5/quart. Made fresh on order, pickup in Maryland Heights. Tastes just like back home!',
 7, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Gokul Dairy (home)", "allergens": "Dairy product. Prepared in a home kitchen that also handles nuts.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-03T08:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Chaat counter for events - pani puri, bhel',
 'Live chaat counter for your parties! Pani puri, bhel, sev puri, dahi puri made fresh in front of guests. From $9/head (min 25). Booking 1 week ahead. Serving STL metro.',
 9, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Mumbai Chaat Cart", "allergens": "Contains wheat, dairy, tamarind. May contain nuts. Prepared on-site.", "pickup": false, "delivery": true, "negotiable": true, "attested": true, "attested_at": "2026-06-02T15:00:00Z"}'::jsonb),

((SELECT id FROM profiles ORDER BY random() LIMIT 1),
 'Non-veg curries - chicken, mutton, fish',
 'Weekend non-veg curries: butter chicken, mutton curry, fish curry. Rich homestyle gravies, frozen-fresh packs available. $13-$16 per container (serves 2-3). Pickup in St. Peters.',
 14, 'St. Louis', 'Missouri', 'food',
 '["https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800"]'::jsonb,
 'active', true, false, now() + interval '60 days',
 '{"business_name": "Kolkata Kitchen (home)", "allergens": "Contains dairy; fish/meat with bones. Prepared in a home kitchen handling nuts & shellfish.", "pickup": true, "delivery": false, "negotiable": false, "attested": true, "attested_at": "2026-06-01T13:00:00Z"}'::jsonb);

-- ============================================================================
-- RIDES (carpool - cost-sharing community rides, no upfront fare)
-- columns: driver_id, requester_id, ride_type, from_location, to_location,
--          ride_date, any_time, seats_available, category, university, notes,
--          status, is_active
-- ride_type 'offer' -> driver_id set; 'request' -> requester_id set
-- ============================================================================
INSERT INTO rides (driver_id, requester_id, ride_type, from_location, to_location, ride_date, any_time, seats_available, category, university, notes, status, is_active) VALUES

-- AIRPORT
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Ballwin, St. Louis', 'STL Lambert Airport', now() + interval '3 days', false, 3, 'airport', NULL, 'Heading to the airport for a morning flight, can drop 2-3 people. Trunk space for luggage. Cost-sharing for gas in chat.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'Chesterfield, St. Louis', 'STL Lambert Airport', now() + interval '5 days', false, 1, 'airport', NULL, 'Need a ride to Lambert for a 6pm flight, 1 medium suitcase. Happy to share gas cost. Flexible by 30 min.', 'active', true),
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'STL Lambert Airport', 'Creve Coeur, St. Louis', now() + interval '2 days', false, 2, 'airport', NULL, 'Picking up family at 9pm, have room for 2 more coming into West County. Let me know your terminal.', 'active', true),

-- UNIVERSITY
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Clayton', 'Wash U', now() + interval '1 days', false, 3, 'university', 'washu', 'Daily morning commute to Wash U south campus, leaving 8:15am. 3 seats. Regular riders welcome.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'Maryland Heights', 'UMSL', now() + interval '2 days', false, 1, 'university', 'umsl', 'Looking for a regular ride to UMSL for fall semester, MWF mornings. Will share gas/parking.', 'active', true),
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Ballwin', 'SLU', now() + interval '4 days', true, 2, 'university', 'slu', 'Drive to SLU most weekdays, flexible timing. 2 seats. Good for med campus folks.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'Olivette', 'Webster University', now() + interval '6 days', false, 1, 'university', 'webster', 'Need a ride to Webster for evening classes Tue/Thu. Can pitch in for gas.', 'active', true),

-- TEMPLE / RELIGIOUS
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Creve Coeur', 'Hindu Temple of St. Louis', now() + interval '3 days', false, 4, 'temple', NULL, 'Going to the temple Sunday morning, can take a family of 4. Leaving around 9:30am from Creve Coeur.', 'active', true),
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Chesterfield', 'Daar-ul-Islam Masjid', now() + interval '1 days', false, 3, 'temple', NULL, 'Friday Jummah ride from Chesterfield area, leaving 12:30pm. 3 seats. Regular weekly trip.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'Ballwin', 'BAPS Shri Swaminarayan Mandir', now() + interval '5 days', false, 2, 'temple', NULL, 'Looking for a ride to mandir this weekend for 2 people. New to the area, happy to share gas.', 'active', true),

-- LONG RIDE (out of state / 2hr+)
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'St. Louis, MO', 'Chicago, IL', now() + interval '7 days', false, 3, 'longride', NULL, 'Driving to Chicago Saturday morning, returning Sunday eve. 3 seats, room for luggage. Split gas + tolls. Can do one stop in Bloomington.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'St. Louis, MO', 'Kansas City, MO', now() + interval '9 days', false, 1, 'longride', NULL, 'Need a ride to KC next weekend, 1 person + 1 suitcase. Flexible on day. Will share fuel cost.', 'active', true),
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'St. Louis, MO', 'Indianapolis, IN', now() + interval '12 days', false, 2, 'longride', NULL, 'Heading to Indy for a wedding, 2 seats open. Leaving Friday afternoon, back Sunday. Cost-share for gas.', 'active', true),

-- GENERAL
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Maryland Heights', 'Patel Brothers, St. Louis', now() + interval '2 days', false, 2, 'general', NULL, 'Grocery run to Patel Brothers + Indian stores on Olive this weekend. 2 seats, can help carry bags.', 'active', true),
(NULL, (SELECT id FROM profiles ORDER BY random() LIMIT 1), 'request', 'University City', 'Downtown St. Louis', now() + interval '1 days', true, 1, 'general', NULL, 'Need a ride downtown anytime tomorrow, flexible. New here, will share gas. Thanks!', 'active', true),
((SELECT id FROM profiles ORDER BY random() LIMIT 1), NULL, 'offer', 'Chesterfield', 'St. Louis Galleria', now() + interval '4 days', false, 3, 'general', NULL, 'Mall trip Saturday afternoon, happy to give a lift to anyone in West County. 3 seats.', 'active', true);

COMMIT;

-- -- Done ---------------------------------------------------------------------
-- Verify counts:
-- SELECT category, count(*) FROM listings GROUP BY category ORDER BY category;
-- SELECT category, ride_type, count(*) FROM rides GROUP BY category, ride_type ORDER BY category;
