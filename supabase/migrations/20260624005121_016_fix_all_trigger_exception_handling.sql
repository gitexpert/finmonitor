-- Add exception handling to all user-creation triggers

CREATE OR REPLACE FUNCTION initialize_cash_balance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cash_ledger (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 50000, 'deposit', 'Initial dry powder allocation');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to initialize cash balance for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION seed_initial_insights()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_insights (user_id, ticker, type, title, message, severity, is_read, action_required)
  VALUES
  (NEW.id, 'DEMO', 'opportunity', 'Welcome to Alpha-1!', 
  'Your AI-powered portfolio monitor is ready. Add positions and watchlist items to receive personalized alerts about volatility, RSI signals, and price targets.', 
  'low', false, false),
  (NEW.id, 'DEMO', 'alert', 'Alert Engine Active',
  'The alerts engine will automatically scan your portfolio every 15 minutes for volatility anomalies, RSI oversold/overbought conditions, and price target matches.',
  'low', false, false);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to seed insights for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create notification settings for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;