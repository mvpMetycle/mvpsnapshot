-- Add PAN Number and IEC Code fields to Company_address table for Indian companies
ALTER TABLE public."Company_address"
ADD COLUMN pan_number text,
ADD COLUMN iec_code text;