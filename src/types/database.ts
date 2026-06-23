export interface DatabaseProfile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabasePosition {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  status: 'active' | 'sold';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface DatabaseWatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  target_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCashLedger {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal' | 'trade_buy' | 'trade_sell';
  description: string | null;
  ticker: string | null;
  shares: number | null;
  price: number | null;
  created_at: string;
}

export interface DatabaseTransaction {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  ticker: string;
  shares: number;
  price: number;
  total: number;
  notes: string | null;
  position_id: string | null;
  created_at: string;
}

export interface DatabaseAIInsight {
  id: string;
  user_id: string;
  ticker: string;
  type: 'alert' | 'opportunity' | 'volatility' | 'earnings' | 'target';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  is_read: boolean;
  action_required: boolean;
  created_at: string;
}

export interface DatabasePortfolioHistory {
  id: string;
  user_id: string;
  date: string;
  total_value: number;
  equity_value: number;
  cash_value: number;
  daily_change: number | null;
  daily_change_percent: number | null;
  created_at: string;
}

export { };
