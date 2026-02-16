-- Asualy: Normalize rooms to strict 3-max-per-user rule
-- - Exactly 1 type='country' room for Canada
-- - Exactly 1 type='province' room per: Ontario, Quebec, Alberta, British Columbia
-- - Exactly 1 type='city' room per V1 city: Montreal, Calgary, Toronto, Brampton, Vancouver, Surrey

-- 1) Ensure type column exists (schema already has it; safe if run on fresh DB)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS type text;

UPDATE public.rooms SET type = 'country' WHERE type IS NULL AND province IS NULL AND city IS NULL;
UPDATE public.rooms SET type = 'province' WHERE type IS NULL AND province IS NOT NULL AND city IS NULL;
UPDATE public.rooms SET type = 'city' WHERE type IS NULL AND city IS NOT NULL;

-- 2) Deactivate all Canada rooms first (we will re-activate only canonical ones)
UPDATE public.rooms
SET is_active = false
WHERE country = 'Canada';

-- 3) Insert canonical rooms if they don't exist, then activate
-- Country room
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT 'country', 'Canada', NULL, NULL, 'Canada', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms
  WHERE country = 'Canada' AND province IS NULL AND city IS NULL
);

-- Province rooms
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT v.type, v.country, v.province, v.city, v.name, true
FROM (VALUES
  ('province'::text, 'Canada'::text, 'Quebec'::text, NULL::text, 'Quebec'),
  ('province', 'Canada', 'Ontario', NULL, 'Ontario'),
  ('province', 'Canada', 'Alberta', NULL, 'Alberta'),
  ('province', 'Canada', 'British Columbia', NULL, 'British Columbia')
) AS v(type, country, province, city, name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.country = v.country AND r.province IS NOT DISTINCT FROM v.province AND r.city IS NOT DISTINCT FROM v.city
);

-- City rooms
INSERT INTO public.rooms (type, country, province, city, name, is_active)
SELECT v.type, v.country, v.province, v.city, v.name, true
FROM (VALUES
  ('city'::text, 'Canada'::text, 'Quebec'::text, 'Montreal'::text, 'Montreal'),
  ('city', 'Canada', 'Alberta', 'Calgary', 'Calgary'),
  ('city', 'Canada', 'Ontario', 'Toronto', 'Toronto'),
  ('city', 'Canada', 'Ontario', 'Brampton', 'Brampton'),
  ('city', 'Canada', 'British Columbia', 'Vancouver', 'Vancouver'),
  ('city', 'Canada', 'British Columbia', 'Surrey', 'Surrey')
) AS v(type, country, province, city, name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.country = v.country AND r.province = v.province AND r.city = v.city
);

-- 4) Deactivate duplicates: for each canonical (country, province, city), keep only the row with smallest id
WITH canonical AS (
  SELECT 'Canada'::text AS country, NULL::text AS province, NULL::text AS city
  UNION ALL SELECT 'Canada', 'Quebec', NULL
  UNION ALL SELECT 'Canada', 'Ontario', NULL
  UNION ALL SELECT 'Canada', 'Alberta', NULL
  UNION ALL SELECT 'Canada', 'British Columbia', NULL
  UNION ALL SELECT 'Canada', 'Quebec', 'Montreal'
  UNION ALL SELECT 'Canada', 'Alberta', 'Calgary'
  UNION ALL SELECT 'Canada', 'Ontario', 'Toronto'
  UNION ALL SELECT 'Canada', 'Ontario', 'Brampton'
  UNION ALL SELECT 'Canada', 'British Columbia', 'Vancouver'
  UNION ALL SELECT 'Canada', 'British Columbia', 'Surrey'
),
keepers AS (
  SELECT DISTINCT ON (r.country, r.province, r.city) r.id
  FROM public.rooms r
  INNER JOIN canonical c
    ON r.country = c.country
    AND r.province IS NOT DISTINCT FROM c.province
    AND r.city IS NOT DISTINCT FROM c.city
  WHERE r.country = 'Canada'
  ORDER BY r.country, r.province, r.city, r.id
)
UPDATE public.rooms r
SET is_active = false
WHERE r.country = 'Canada'
  AND r.id NOT IN (SELECT id FROM keepers);

-- 5) Reactivate only canonical keepers (one per country/province/city in our canonical set)
UPDATE public.rooms r
SET is_active = true
WHERE r.country = 'Canada'
  AND r.id IN (
    SELECT r2.id
    FROM public.rooms r2
    INNER JOIN (
      SELECT 'Canada'::text AS country, NULL::text AS province, NULL::text AS city
      UNION ALL SELECT 'Canada', 'Quebec', NULL
      UNION ALL SELECT 'Canada', 'Ontario', NULL
      UNION ALL SELECT 'Canada', 'Alberta', NULL
      UNION ALL SELECT 'Canada', 'British Columbia', NULL
      UNION ALL SELECT 'Canada', 'Quebec', 'Montreal'
      UNION ALL SELECT 'Canada', 'Alberta', 'Calgary'
      UNION ALL SELECT 'Canada', 'Ontario', 'Toronto'
      UNION ALL SELECT 'Canada', 'Ontario', 'Brampton'
      UNION ALL SELECT 'Canada', 'British Columbia', 'Vancouver'
      UNION ALL SELECT 'Canada', 'British Columbia', 'Surrey'
    ) c ON r2.country = c.country
       AND r2.province IS NOT DISTINCT FROM c.province
       AND r2.city IS NOT DISTINCT FROM c.city
    WHERE r2.id = (
      SELECT MIN(r3.id) FROM public.rooms r3
      WHERE r3.country = r2.country
        AND r3.province IS NOT DISTINCT FROM r2.province
        AND r3.city IS NOT DISTINCT FROM r2.city
    )
  );
