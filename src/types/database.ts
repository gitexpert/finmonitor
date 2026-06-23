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

export interface DatabaseGroup {
  id: string;
  group_name: string;
  owner_id: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseGroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  invited_by: string;
  invitation_email: string;
  nickname: string | null;
  permission_level: 'view' | 'view_details' | 'admin';
  share_positions: boolean;
  share_cash: boolean;
  share_transactions: boolean;
  is_accepted: boolean;
  invited_at: string;
  accepted_at: string | null;
}

export interface DatabaseNotificationSettings {
  id: string;
  user_id: string;
  in_app_notifications: boolean;
  sms_urgent: boolean;
  email_digest: boolean;
  email_address: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
  digest_time: string;
  alert_threshold_high: 'high' | 'medium' | 'low';
  alert_threshold_medium: 'high' | 'medium' | 'low' | 'none';
  alert_threshold_low: 'high' | 'medium' | 'low' | 'none';
  notify_on_volatile: boolean;
  notify_on_opportunity: boolean;
  notify_on_target: boolean;
  notify_on_entry: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseNotificationLog {
  id: string;
  user_id: string;
  insight_id: string | null;
  channel: 'in_app' | 'sms' | 'email';
  status: 'pending' | 'sent' | 'failed' | 'rate_limited';
  sent_at: string | null;
  error_message: string | null;
  provider_response: Record<string, unknown> | null;
  created_at: string;
}

export interface FamilyConsolidatedWealth {
  group_id: string;
  group_name: string;
  owner_id: string;
  member_id: string;
  member_user_id: string;
  nickname: string | null;
  permission_level: string;
  share_positions: boolean;
  share_cash: boolean;
  share_transactions: boolean;
  position_count: number;
  member_email: string;
}

export { };
