-- ============================================================
-- Seed: categories
-- ============================================================
-- Safe to re-run (insert ... on conflict do nothing)

insert into categories (name, icon, description) values
  ('Plumbing',         '🔧', 'Pipe repairs, leaks, installations, drainage'),
  ('Electrical',       '⚡', 'Wiring, fuse boxes, appliance connections, fan fitting'),
  ('Carpentry',        '🪚', 'Furniture assembly, door/window frames, custom woodwork'),
  ('AC & Cooling',     '❄️', 'AC installation, gas refill, servicing, repair'),
  ('Painting',         '🎨', 'Interior/exterior painting, wall prep, touch-ups'),
  ('Tiling & Masonry', '🧱', 'Floor/wall tiling, grouting, cement work'),
  ('Renovation',       '🏗️', 'General home renovation, room makeovers'),
  ('Appliance Repair', '🔌', 'Washing machines, fridges, ovens, dishwashers'),
  ('Cleaning',         '🧹', 'Deep cleaning, after-renovation cleaning, carpet cleaning'),
  ('Mechanic',         '🔩', 'Vehicle repair, oil change, tyre change, battery replacement')
on conflict (name) do nothing;
