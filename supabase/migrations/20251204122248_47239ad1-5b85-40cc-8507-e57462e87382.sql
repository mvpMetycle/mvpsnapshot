-- Add new fields for simplified claims workflow
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claimed_file_date date;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS external_inspection_provided boolean DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS external_inspection_report_url text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS first_day_communicated_to_supplier date;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_evidence_files text[] DEFAULT '{}';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_photo_urls text[] DEFAULT '{}';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_debit_note_url text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS supplier_shared_docs_urls text[] DEFAULT '{}';

-- Update claim_type_enum to new values
-- First, we need to alter the enum type
ALTER TYPE claim_type_enum ADD VALUE IF NOT EXISTS 'loss_of_metal';
ALTER TYPE claim_type_enum ADD VALUE IF NOT EXISTS 'dust';

-- Update claim_status_enum to add 'submitted' status
ALTER TYPE claim_status_enum ADD VALUE IF NOT EXISTS 'submitted';

-- Drop the old trigger and function for window calculations (no longer needed)
DROP TRIGGER IF EXISTS calculate_claim_windows_trigger ON claims;
DROP FUNCTION IF EXISTS calculate_claim_windows();

-- Drop obsolete columns (preliminary/formal workflow)
ALTER TABLE claims DROP COLUMN IF EXISTS preliminary_claim_date;
ALTER TABLE claims DROP COLUMN IF EXISTS formal_claim_date;
ALTER TABLE claims DROP COLUMN IF EXISTS is_within_2_day_window;
ALTER TABLE claims DROP COLUMN IF EXISTS is_within_7_day_window;
ALTER TABLE claims DROP COLUMN IF EXISTS is_valid_claim;