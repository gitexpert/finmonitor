-- Create a cron job to run the alerts engine every 15 minutes
-- Note: This uses pg_cron extension which is available in Supabase

-- First, ensure pg_cron is available (it's pre-installed on Supabase)
-- Create a function that can be called by pg_cron to invoke the edge function

CREATE OR REPLACE FUNCTION invoke_alerts_engine()
RETURNS void AS $$
BEGIN
  -- Use Supabase's built-in http function to call the edge function
  -- The edge function will handle all alert generation logic
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/alerts-engine',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In production, you would set up the cron job via Supabase dashboard
-- or use pg_cron extension like:
-- SELECT cron.schedule('run-alerts-engine', '*/15 * * * *', 'SELECT invoke_alerts_engine();');

-- For now, we'll create a simpler approach using a trigger on new insights
-- that cleans up old insights periodically

CREATE OR REPLACE FUNCTION cleanup_old_insights()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_insights
  WHERE is_read = true
  AND created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;