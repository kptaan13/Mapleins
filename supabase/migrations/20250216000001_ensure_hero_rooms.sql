-- Mapleins: Ensure all 7 V1 hero cities have exactly 1 country, 1 province, 1 city room each
-- Idempotent: safe to run multiple times
-- Hero cities: Montreal, Toronto, Brampton, Calgary, Edmonton, Vancouver, Surrey

-- 1) Ensure type column
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS type text;

-- 2) Country room (Canada)
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT 'country', 'Canada', NULL, NULL, 'Canada', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms
  WHERE country = 'Canada' AND province IS NULL AND city IS NULL AND type = 'country'
);

-- 3) Province rooms
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT v.type, v.country, v.province, v.city, v.name, true
FROM (VALUES
  ('province', 'Canada', 'Quebec', NULL, 'Quebec'),
  ('province', 'Canada', 'Ontario', NULL, 'Ontario'),
  ('province', 'Canada', 'Alberta', NULL, 'Alberta'),
  ('province', 'Canada', 'British Columbia', NULL, 'British Columbia')
) AS v(type, country, province, city, name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.country = v.country AND r.province IS NOT DISTINCT FROM v.province
    AND r.city IS NOT DISTINCT FROM v.city AND r.type = v.type
);

-- 4) City rooms (7 V1 hero cities)
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT v.type, v.country, v.province, v.city, v.name, true
FROM (VALUES
  ('city', 'Canada', 'Quebec', 'Montreal', 'Montreal'),
  ('city', 'Canada', 'Ontario', 'Toronto', 'Toronto'),
  ('city', 'Canada', 'Ontario', 'Brampton', 'Brampton'),
  ('city', 'Canada', 'Alberta', 'Calgary', 'Calgary'),
  ('city', 'Canada', 'Alberta', 'Edmonton', 'Edmonton'),
  ('city', 'Canada', 'British Columbia', 'Vancouver', 'Vancouver'),
  ('city', 'Canada', 'British Columbia', 'Surrey', 'Surrey')
) AS v(type, country, province, city, name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.country = v.country AND r.province = v.province AND r.city = v.city AND r.type = v.type
);

-- 5) Normalize room names: only plain location (Canada, Province, City) – no "newcomers" etc.
UPDATE public.rooms SET name = COALESCE(city, province, country) WHERE country = 'Canada';

-- 6) Activate canonical rooms (in case any were deactivated)
UPDATE public.rooms SET is_active = true
WHERE country = 'Canada'
  AND (
    (type = 'country' AND province IS NULL AND city IS NULL)
    OR (type = 'province' AND province IN ('Quebec','Ontario','Alberta','British Columbia') AND city IS NULL)
    OR (type = 'city' AND (
      (province = 'Quebec' AND city = 'Montreal')
      OR (province = 'Ontario' AND city IN ('Toronto','Brampton'))
      OR (province = 'Alberta' AND city IN ('Calgary','Edmonton'))
      OR (province = 'British Columbia' AND city IN ('Vancouver','Surrey'))
    ))
  );
