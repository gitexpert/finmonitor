export interface Position {
  id: string;
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  allocation: number;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  targetPrice?: number;
  notes?: string;
}

export interface CashReserve {
  id: string;
  name: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface AIInsight {
  id: string;
  ticker: string;
  type: 'alert' | 'opportunity' | 'volatility' | 'earnings' | 'target';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  isRead: boolean;
  actionRequired?: boolean;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  equityValue: number;
}

export interface PerformanceData {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  ticker: string;
  shares: number;
  price: number;
  total: number;
  timestamp: string;
  notes?: string;
}
