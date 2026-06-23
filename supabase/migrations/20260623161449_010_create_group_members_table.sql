-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitation_email TEXT NOT NULL,
  nickname TEXT,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'view_details', 'admin')),
  share_positions BOOLEAN DEFAULT true NOT NULL,
  share_cash BOOLEAN DEFAULT true NOT NULL,
  share_transactions BOOLEAN DEFAULT false NOT NULL,
  is_accepted BOOLEAN DEFAULT false NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(group_id, invitation_email)
);

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
CREATE POLICY "select_own_memberships" ON group_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

CREATE POLICY "insert_as_owner" ON group_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

CREATE POLICY "update_group_members" ON group_members FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

CREATE POLICY "delete_group_members" ON group_members FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND owner_id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_invitation_email ON group_members(invitation_email);