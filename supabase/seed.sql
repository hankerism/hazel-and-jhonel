-- Seed: Hazel Jean & Jhonel Rhey — November 30, 2026
-- Mirrors content/seed.ts (the local development fallback).

insert into public.weddings (
  id, slug, bride_name, groom_name, wedding_date, ceremony_time, timezone,
  ceremony_venue, ceremony_address, reception_time, reception_venue,
  reception_address, rsvp_deadline, dress_code, wedding_colors, parking_note,
  welcome_message, hero_image
) values (
  '00000000-0000-0000-0000-000000000001',
  'hazel-and-jhonel',
  'Hazel Jean',
  'Jhonel Rhey',
  '2026-11-30',
  '16:00',
  'Asia/Manila',
  'Hacienda Solange Private Events Place',
  E'Brgy. 07 Aguinaldo, Alfonso Road\nEsperanza Ilaya, Alfonso, Cavite\nPhilippines',
  '18:30',
  'Hacienda Solange Private Events Place',
  E'Brgy. 07 Aguinaldo, Alfonso Road\nEsperanza Ilaya, Alfonso, Cavite\nPhilippines',
  '2026-11-24',
  'Formal',
  array['Black', 'Gold'],
  'Complimentary parking is available on the venue grounds. Attendants will guide you upon arrival.',
  'Join us as we celebrate our love and begin our journey together.',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2400&q=80'
);

insert into public.schedule_items (wedding_id, event_time, title, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '15:30', 'Guest Arrival', 1),
  ('00000000-0000-0000-0000-000000000001', '16:00', 'Ceremony', 2),
  ('00000000-0000-0000-0000-000000000001', '17:30', 'Cocktail Hour', 3),
  ('00000000-0000-0000-0000-000000000001', '18:30', 'Reception', 4),
  ('00000000-0000-0000-0000-000000000001', '20:00', 'Dinner', 5),
  ('00000000-0000-0000-0000-000000000001', '21:00', 'First Dance', 6),
  ('00000000-0000-0000-0000-000000000001', '22:00', 'Open Dance Floor', 7),
  ('00000000-0000-0000-0000-000000000001', '00:00', 'Closing', 8);

insert into public.gallery_images (wedding_id, image_url, caption, display_order) values
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80', 'A quiet moment', 1),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80', 'The walk', 2),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=80', 'Golden hour', 3),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80', 'Table for two', 4),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1600&q=80', 'Evening lights', 5),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1600&q=80', 'The first dance', 6),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1600&q=80', 'With this ring', 7),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1600&q=80', 'Celebration', 8);

insert into public.faqs (wedding_id, question, answer, display_order) values
  ('00000000-0000-0000-0000-000000000001', 'What is the dress code?', 'Formal attire, in keeping with our black and gold celebration. Suits or barongs for gentlemen, and long dresses or elegant evening wear for ladies.', 1),
  ('00000000-0000-0000-0000-000000000001', 'Can I bring a plus one?', 'If your invitation includes a plus one, there is a place for their name on the RSVP form. We would love to know who is joining you.', 2),
  ('00000000-0000-0000-0000-000000000001', 'Are children invited?', 'We adore your little ones, and children named on your invitation are warmly welcome. Please include them in your guest count when you RSVP.', 3),
  ('00000000-0000-0000-0000-000000000001', 'Where can I park?', 'Complimentary parking is available on the grounds of Hacienda Solange. Attendants will be on hand to guide you when you arrive.', 4),
  ('00000000-0000-0000-0000-000000000001', 'What time should I arrive?', 'Guest arrival begins at 3:30 PM, and the ceremony starts promptly at 4:00 PM. We suggest arriving early to find your seat and settle in.', 5),
  ('00000000-0000-0000-0000-000000000001', 'Who do I contact with questions?', 'Reach out to the couple or their families directly, or leave a note in the message field of your RSVP and we will get back to you.', 6);
