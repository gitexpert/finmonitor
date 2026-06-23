-- Create function to get cash balance
CREATE OR REPLACE FUNCTION get_cash_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('deposit', 'trade_sell') THEN amount
      WHEN transaction_type IN ('withdrawal', 'trade_buy') THEN -amount
    END
  ), 0) INTO balance
  FROM cash_ledger
  WHERE user_id = p_user_id;
  
  RETURN balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;