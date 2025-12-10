-- Add QP anchor and offset columns to ticket table
ALTER TABLE public.ticket
ADD COLUMN qp_start_anchor text,
ADD COLUMN qp_start_offset_days integer,
ADD COLUMN qp_end_anchor text,
ADD COLUMN qp_end_offset_days integer;