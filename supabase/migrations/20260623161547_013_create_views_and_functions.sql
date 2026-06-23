-- Create family_consolidated_wealth view for group owners
-- This view provides aggregated wealth data for all accepted group members
CREATE OR REPLACE VIEW family_consolidated_wealth AS
SELECT 
  g.id as group_id,
  g.group_name,
  g.owner_id,
  gm.id as member_id,
  gm.user_id as member_user_id,
  gm.nickname,
  gm.permission_level,
  gm.share_positions,
  gm.share_cash,
  gm.share_transactions,
  (SELECT COUNT(*) FROM positions WHERE user_id = gm.user_id AND status = 'active') as position_count,
  COALESCE(p.email, 'Unknown') as member_email
FROM groups g
JOIN group_members gm ON g.id = gm.group_id AND gm.is_accepted = true
LEFT JOIN profiles p ON gm.user_id = p.user_id;

-- Enable RLS on view
ALTER TABLE family_consolidated_wealth SET (security_barrier = on);

-- Create a function for group owners to get network summary
CREATE OR REPLACE FUNCTION get_group_network_summary(p_group_id UUID)
RETURNS TABLE(
  group_name TEXT,
  owner_id UUID,
  member_count BIGINT,
  active_members BIGINT,
  pending_invites BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.group_name,
    g.owner_id,
    COUNT(gm.id)::BIGINT as member_count,
    SUM(CASE WHEN gm.is_accepted = true THEN 1 ELSE 0 END)::BIGINT as active_members,
    SUM(CASE WHEN gm.is_accepted = false THEN 1 ELSE 0 END)::BIGINT as pending_invites
  FROM groups g
  LEFT JOIN group_members gm ON g.id = gm.group_id
  WHERE g.id = p_group_id AND g.owner_id = auth.uid()
  GROUP BY g.id, g.group_name, g.owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-create notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();

-- Create function to log notification on new high-severity insight
CREATE OR REPLACE FUNCTION log_insight_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'high' AND NEW.is_read = false THEN
    INSERT INTO notification_logs (user_id, insight_id, channel, status)
    VALUES (NEW.user_id, NEW.id, 'in_app', 'pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_insight_created_log ON ai_insights;
CREATE TRIGGER on_insight_created_log
  AFTER INSERT ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION log_insight_notification();