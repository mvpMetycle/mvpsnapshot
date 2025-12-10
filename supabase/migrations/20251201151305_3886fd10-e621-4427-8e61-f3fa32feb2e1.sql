CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL,
  conditions JSONB NOT NULL,
  required_approvers TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
)