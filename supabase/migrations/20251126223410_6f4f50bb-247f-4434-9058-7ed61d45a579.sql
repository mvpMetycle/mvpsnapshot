-- Fix the fixation_method enum to have proper separate values
ALTER TYPE fixation_method_enum RENAME TO fixation_method_enum_old;

CREATE TYPE fixation_method_enum AS ENUM ('1-day', '5-day avg', 'Month avg', 'Custom');

-- Update the ticket table to use the new enum
ALTER TABLE ticket 
  ALTER COLUMN fixation_method TYPE fixation_method_enum 
  USING fixation_method::text::fixation_method_enum;

-- Drop the old enum
DROP TYPE fixation_method_enum_old;