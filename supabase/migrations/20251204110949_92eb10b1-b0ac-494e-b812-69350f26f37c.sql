-- Create enum types for hedge management system

DO $$ BEGIN
  CREATE TYPE reference_type AS ENUM ('LME_CASH', 'LME_3M', 'COMEX', 'SHFE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hedge_request_source AS ENUM ('MANUAL', 'AUTO', 'IMPORT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hedge_direction AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hedge_instrument AS ENUM ('FUTURE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hedge_link_level AS ENUM ('ORDER', 'TICKET', 'BL_ORDER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;