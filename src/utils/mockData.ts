import type { Position, WatchlistItem, AIInsight, CashReserve, PerformanceData } from '../types';

const STORAGE_KEYS = {
  POSITIONS: 'alpha1_positions',
  WATCHLIST: 'alpha1_watchlist',
  CASH: 'alpha1_cash',
  INSIGHTS: 'alpha1_insights',
  PERFORMANCE: 'alpha1_performance',
  USER: 'alpha1_user',
  TRANSACTIONS: 'alpha1_transactions',
};

const generateId = (): string => Math.random().toString(36).substring(2, 15);

const STOCK_PRICES: Record<string, { price: number; change: number; name: string }> = {
  NVDA: { price: 875.42, change: 2.34, name: 'NVIDIA Corporation' },
  MU: { price: 156.78, change: -1.23, name: 'Micron Technology' },
  RKLB: { price: 5.89, change: 0.45, name: 'Rocket Lab USA' },
  VRT: { price: 52.32, change: 1.87, name: 'Vertiv Holdings' },
  AMD: { price: 167.45, change: 3.21, name: 'Advanced Micro Devices' },
  PLTR: { price: 26.78, change: 0.89, name: 'Palantir Technologies' },
  SOFI: { price: 7.45, change: -0.15, name: 'SoFi Technologies' },
  COIN: { price: 234.56, change: -4.32, name: 'Coinbase Global' },
  TSLA: { price: 245.67, change: 5.67, name: 'Tesla Inc.' },
  AAPL: { price: 178.23, change: 0.45, name: 'Apple Inc.' },
  MSFT: { price: 423.89, change: 1.23, name: 'Microsoft Corporation' },
  META: { price: 502.34, change: -2.45, name: 'Meta Platforms' },
};

export function getInitialPositions(): Position[] {
  const stored = localStorage.getItem(STORAGE_KEYS.POSITIONS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, fall through to defaults
    }
  }

  const positions: Position[] = [
    createPosition('NVDA', 25, 520.50, generateId()),
    createPosition('MU', 50, 142.30, generateId()),
    createPosition('RKLB', 500, 4.25, generateId()),
    createPosition('VRT', 100, 38.75, generateId()),
    createPosition('AMD', 30, 145.20, generateId()),
    createPosition('PLTR', 200, 18.50, generateId()),
  ];

  savePositions(positions);
  return positions;
}

function createPosition(ticker: string, shares: number, avgCost: number, id: string): Position {
  const stockData = STOCK_PRICES[ticker] || { price: 100, change: 0, name: ticker };
  const currentPrice = stockData.price;
  const totalValue = shares * currentPrice;
  const totalCost = shares * avgCost;
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    id,
    ticker,
    shares,
    averageCost: avgCost,
    currentPrice,
    dayChange: stockData.change,
    dayChangePercent: (stockData.change / (currentPrice - stockData.change)) * 100,
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    allocation: 0,
  };
}

export function savePositions(positions: Position[]): void {
  localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
}

export function getInitialWatchlist(): WatchlistItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, fall through to defaults
    }
  }

  const watchlist: WatchlistItem[] = [
    createWatchlistItem('NVDA', 900, generateId()),
    createWatchlistItem('TSLA', 260, generateId()),
    createWatchlistItem('AAPL', 185, generateId()),
    createWatchlistItem('COIN', 250, generateId()),
    createWatchlistItem('RKLB', 8, generateId()),
  ];

  saveWatchlist(watchlist);
  return watchlist;
}

function createWatchlistItem(ticker: string, targetPrice: number, id: string): WatchlistItem {
  const stockData = STOCK_PRICES[ticker] || { price: 100, change: 0, name: ticker };

  return {
    id,
    ticker,
    name: stockData.name,
    currentPrice: stockData.price,
    dayChange: stockData.change,
    dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
    targetPrice,
  };
}

export function saveWatchlist(watchlist: WatchlistItem[]): void {
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
}

export function getInitialCashReserve(): CashReserve {
  const stored = localStorage.getItem(STORAGE_KEYS.CASH);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, fall through to defaults
    }
  }

  const cash: CashReserve = {
    id: generateId(),
    name: 'Dry Powder',
    balance: 50000,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
  };

  saveCashReserve(cash);
  return cash;
}

export function saveCashReserve(cash: CashReserve): void {
  localStorage.setItem(STORAGE_KEYS.CASH, JSON.stringify(cash));
}

export function getInitialInsights(): AIInsight[] {
  const stored = localStorage.getItem(STORAGE_KEYS.INSIGHTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, fall through to defaults
    }
  }

  const insights: AIInsight[] = [
    {
      id: generateId(),
      ticker: 'NVDA',
      type: 'volatility',
      title: 'Elevated Volatility Detected',
      message: 'NVDA showing 15% higher volatility than 30-day average. Consider tightening stop-losses or reducing position size.',
      severity: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      isRead: false,
    },
    {
      id: generateId(),
      ticker: 'RKLB',
      type: 'opportunity',
      title: 'Potential Entry Point',
      message: 'RKLB approaching key support at $5.50. RSI at 32 suggests oversold conditions. Consider dollar-cost averaging.',
      severity: 'low',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isRead: false,
    },
    {
      id: generateId(),
      ticker: 'MU',
      type: 'earnings',
      title: 'Earnings Approaching',
      message: 'MU earnings report scheduled in 5 days. Expect higher volatility. Current implied volatility premium at 23%.',
      severity: 'high',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      isRead: true,
    },
    {
      id: generateId(),
      ticker: 'VRT',
      type: 'target',
      title: 'Target Price Alert',
      message: 'VRT has reached 95% of your $55 price target. Consider taking partial profits or trailing your stop.',
      severity: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      isRead: false,
      actionRequired: true,
    },
    {
      id: generateId(),
      ticker: 'AMD',
      type: 'alert',
      title: 'Sector Correlation Alert',
      message: 'AMD showing decoupling from semiconductor index. Underperformance of 4.2% vs SOX over past week may indicate sector rotation.',
      severity: 'low',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      isRead: true,
    },
  ];

  saveInsights(insights);
  return insights;
}

export function saveInsights(insights: AIInsight[]): void {
  localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(insights));
}

export function getPerformanceHistory(): PerformanceData[] {
  const stored = localStorage.getItem(STORAGE_KEYS.PERFORMANCE);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, fall through to defaults
    }
  }

  const baseValue = 75000;
  const data: PerformanceData[] = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayVariation = (Math.sin(i * 0.3) * 0.03 + Math.random() * 0.02 - 0.01);
    const value = baseValue * (1 + dayVariation + (30 - i) * 0.003);
    const prevValue = i === 30 ? baseValue : data[data.length - 1]?.value || baseValue;

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      change: Math.round((value - prevValue) * 100) / 100,
      changePercent: Math.round(((value - prevValue) / prevValue) * 10000) / 100,
    });
  }

  savePerformanceHistory(data);
  return data;
}

export function savePerformanceHistory(data: PerformanceData[]): void {
  localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(data));
}

export function getStockPrice(ticker: string): { price: number; change: number } {
  const stock = STOCK_PRICES[ticker.toUpperCase()] || { price: 100, change: 0 };
  return stock;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

export { STORAGE_KEYS, generateId };
