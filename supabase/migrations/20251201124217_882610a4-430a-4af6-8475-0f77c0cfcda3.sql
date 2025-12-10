-- Add Detected KYB integration columns to Company table
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS detected_profile_id text;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS detected_review_status text;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS detected_risk_category text;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS detected_risk_label text;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS detected_last_checked timestamp with time zone;