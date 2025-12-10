-- Add soft delete columns to all relevant tables

-- ticket table
ALTER TABLE public.ticket 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- order table
ALTER TABLE public."order" 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- bl_order table
ALTER TABLE public.bl_order 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- invoice table
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- payment table
ALTER TABLE public.payment 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- bl_container_photos table
ALTER TABLE public.bl_container_photos 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- company_documents table
ALTER TABLE public.company_documents 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- company_notes table
ALTER TABLE public.company_notes 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- claims table
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS delete_reason text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create indexes for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_ticket_deleted_at ON public.ticket(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_deleted_at ON public."order"(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bl_order_deleted_at ON public.bl_order(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_deleted_at ON public.invoice(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_deleted_at ON public.payment(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bl_container_photos_deleted_at ON public.bl_container_photos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_documents_deleted_at ON public.company_documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_notes_deleted_at ON public.company_notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_claims_deleted_at ON public.claims(deleted_at) WHERE deleted_at IS NULL;