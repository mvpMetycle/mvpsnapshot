-- Add new fields for Claim Evidence and Settlement sections
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_due_date date;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'Open';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS settlement_option text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS days_to_resolve_since_ata integer;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS days_to_resolve_since_claim integer;