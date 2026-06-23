-- Create cash_ledger table
CREATE TABLE IF NOT EXISTS cash_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(18, 6) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'trade_buy', 'trade_sell')),
  description TEXT,
  ticker TEXT,
  shares NUMERIC(18, 6),
  price NUMERIC(18, 6),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE cash_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_ledger
CREATE POLICY "select_own_cash_ledger" ON cash_ledger FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_cash_ledger" ON cash_ledger FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_cash_ledger" ON cash_ledger FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_ledger_user_id ON cash_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_created_at ON cash_ledger(created_at DESC);

-- Create a view for current cash balance
CREATE OR REPLACE VIEW cash_balance AS
SELECT 
  user_id,
  COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('deposit', 'trade_sell') THEN amount
      WHEN transaction_type IN ('withdrawal', 'trade_buy') THEN -amount
    END
  ), 0) AS balance
FROM cash_ledger
GROUP BY user_id;

-- Enable RLS on the view
ALTER TABLE cash_balance SET (security_barrier = on);

-- Create a function to get initial cash balance for new users
CREATE OR REPLACE FUNCTION initialize_cash_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cash_ledger (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 50000, 'deposit', 'Initial dry powder allocation');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize cash for new users
DROP TRIGGER IF EXISTS on_user_created_init_cash ON auth.users;
CREATE TRIGGER on_user_created_init_cash
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_cash_balance();