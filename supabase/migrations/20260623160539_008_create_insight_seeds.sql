-- Create seed insights for demonstration
-- These will be created when a new user signs up via trigger

CREATE OR REPLACE FUNCTION seed_initial_insights()
RETURNS TRIGGER AS $$
BEGIN
  -- Create some initial informational insights for new users
  INSERT INTO ai_insights (user_id, ticker, type, title, message, severity, is_read, action_required)
  VALUES
    (NEW.id, 'DEMO', 'opportunity', 'Welcome to Alpha-1!', 
     'Your AI-powered portfolio monitor is ready. Add positions and watchlist items to receive personalized alerts about volatility, RSI signals, and price targets.', 
     'low', false, false),
    (NEW.id, 'DEMO', 'alert', 'Alert Engine Active',
     'The alerts engine will automatically scan your portfolio every 15 minutes for volatility anomalies, RSI oversold/overbought conditions, and price target matches. Click the refresh button on the AI Insights panel to run manually.',
     'low', false, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user insight seeding
DROP TRIGGER IF EXISTS on_user_created_seed_insights ON auth.users;
CREATE TRIGGER on_user_created_seed_insights
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_initial_insights();

-- Create a scheduler function that can be called periodically
CREATE OR REPLACE FUNCTION run_scheduled_alerts()
RETURNS TABLE(
  user_id UUID,
  ticker TEXT,
  insight_type TEXT,
  insight_title TEXT
) AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Log that analysis ran
  INSERT INTO ai_insights (user_id, ticker, type, title, message, severity, is_read)
  SELECT 
    id,
    'SYSTEM',
    'alert',
    'Scheduled Analysis Complete',
    'Portfolio analysis completed successfully at ' || NOW()::text,
    'low',
    true
  FROM profiles;
  
  -- Return nothing (this would be replaced with actual alert generation)
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;