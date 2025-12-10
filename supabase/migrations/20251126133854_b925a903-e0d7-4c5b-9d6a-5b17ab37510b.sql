-- Disable RLS on Company and Company_address tables to allow data operations
-- This is a temporary solution - you should implement proper authentication and RLS policies later

ALTER TABLE "Company" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Company_address" DISABLE ROW LEVEL SECURITY;