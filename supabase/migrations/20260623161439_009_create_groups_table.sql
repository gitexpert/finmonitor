-- Create groups table first
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "select_own_groups" ON groups FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "insert_own_groups" ON groups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "update_own_groups" ON groups FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "delete_own_groups" ON groups FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();