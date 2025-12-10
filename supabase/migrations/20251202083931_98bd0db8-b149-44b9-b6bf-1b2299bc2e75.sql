-- Migrate lme_action_needed from text to integer (1 = Yes, 0 = No)

-- Add new integer column
ALTER TABLE ticket ADD COLUMN lme_action_needed_int INTEGER;

-- Migrate existing data
UPDATE ticket 
SET lme_action_needed_int = CASE 
  WHEN lme_action_needed = 'Yes' THEN 1
  WHEN lme_action_needed = 'No' THEN 0
  ELSE NULL
END;

-- Drop old text column
ALTER TABLE ticket DROP COLUMN lme_action_needed;

-- Rename new column to original name
ALTER TABLE ticket RENAME COLUMN lme_action_needed_int TO lme_action_needed;