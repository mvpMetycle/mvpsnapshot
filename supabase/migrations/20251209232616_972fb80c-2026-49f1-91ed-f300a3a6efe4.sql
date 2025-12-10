-- Create revenue table for storing recognized revenue per BL Order
CREATE TABLE public.revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bl_order_id BIGINT REFERENCES public.bl_order(id),
  bl_order_name TEXT REFERENCES public.bl_order(bl_order_name),
  recognition_date DATE NOT NULL,
  final_invoice_amount NUMERIC NOT NULL DEFAULT 0,
  allocated_downpayment_amount NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view revenue" ON public.revenue FOR SELECT USING (true);
CREATE POLICY "Anyone can insert revenue" ON public.revenue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update revenue" ON public.revenue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete revenue" ON public.revenue FOR DELETE USING (true);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_revenue_updated_at
BEFORE UPDATE ON public.revenue
FOR EACH ROW
EXECUTE FUNCTION public.update_revenue_updated_at();

-- Create index for common queries
CREATE INDEX idx_revenue_recognition_date ON public.revenue(recognition_date);
CREATE INDEX idx_revenue_bl_order_id ON public.revenue(bl_order_id);
CREATE INDEX idx_revenue_bl_order_name ON public.revenue(bl_order_name);