-- Step 1: Add temporary column
ALTER TABLE ticket ADD COLUMN currency_iso text;

-- Step 2: Extract ISO codes from existing currency values (cast enum to text first)
UPDATE ticket 
SET currency_iso = CASE
  WHEN currency::text LIKE 'USD%' THEN 'USD'
  WHEN currency::text LIKE 'EUR%' THEN 'EUR'
  WHEN currency::text LIKE 'GBP%' THEN 'GBP'
  WHEN currency::text LIKE 'CNY%' THEN 'CNY'
  WHEN currency::text LIKE 'JPY%' THEN 'JPY'
  WHEN currency::text LIKE 'AUD%' THEN 'AUD'
  WHEN currency::text LIKE 'CAD%' THEN 'CAD'
  WHEN currency::text LIKE 'CHF%' THEN 'CHF'
  ELSE SUBSTRING(currency::text FROM 1 FOR 3)
END
WHERE currency IS NOT NULL;

-- Step 3: Drop old currency column
ALTER TABLE ticket DROP COLUMN currency;

-- Step 4: Rename currency_iso to currency
ALTER TABLE ticket RENAME COLUMN currency_iso TO currency;

-- Step 5: Update the currency enum to only include ISO codes
DROP TYPE IF EXISTS currency_enum CASCADE;
CREATE TYPE currency_enum AS ENUM ('USD', 'EUR', 'GBP', 'CNY', 'JPY', 'AUD', 'CAD', 'CHF');

-- Step 6: Convert currency column to use the enum
ALTER TABLE ticket ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum;