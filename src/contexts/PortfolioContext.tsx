import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Position, WatchlistItem, AIInsight, CashReserve, PerformanceData, Transaction } from '../types';
import {
  getInitialPositions,
  savePositions,
  getInitialWatchlist,
  saveWatchlist,
  getInitialInsights,
  saveInsights,
  getInitialCashReserve,
  saveCashReserve,
  getPerformanceHistory,
  generateId,
  getStockPrice,
} from '../utils/mockData';

interface PortfolioContextType {
  positions: Position[];
  watchlist: WatchlistItem[];
  insights: AIInsight[];
  cash: CashReserve;
  performance: PerformanceData[];
  transactions: Transaction[];
  isLoading: boolean;
  addPosition: (ticker: string, shares: number, avgCost: number) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;
  addToWatchlist: (ticker: string, targetPrice?: number) => void;
  removeFromWatchlist: (id: string) => void;
  markInsightRead: (id: string) => void;
  updateCashBalance: (amount: number, reason: string) => void;
  refreshPrices: () => void;
  getPositionMetrics: () => {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange: number;
    dayChangePercent: number;
  };
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const TRANSACTIONS_KEY = 'alpha1_transactions';

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [cash, setCash] = useState<CashReserve | null>(null);
  const [performance, setPerformance] = useState<PerformanceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    const loadedTransactions: Transaction[] = stored ? JSON.parse(stored) : [];

    setPositions(getInitialPositions());
    setWatchlist(getInitialWatchlist());
    setInsights(getInitialInsights());
    setCash(getInitialCashReserve());
    setPerformance(getPerformanceHistory());
    setTransactions(loadedTransactions);
    setIsLoading(false);
  }, []);

  const addTransaction = useCallback((type: 'buy' | 'sell', ticker: string, shares: number, price: number) => {
    const transaction: Transaction = {
      id: generateId(),
      type,
      ticker,
      shares,
      price,
      total: shares * price,
      timestamp: new Date().toISOString(),
    };

    setTransactions(prev => {
      const updated = [transaction, ...prev];
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addPosition = useCallback((ticker: string, shares: number, avgCost: number) => {
    const upperTicker = ticker.toUpperCase();
    const stockData = getStockPrice(upperTicker);

    setPositions(prev => {
      const existing = prev.find(p => p.ticker === upperTicker);

      if (existing) {
        const newShares = existing.shares + shares;
        const newAvgCost = ((existing.averageCost * existing.shares) + (avgCost * shares)) / newShares;
        const totalValue = newShares * stockData.price;
        const totalCost = newShares * newAvgCost;

        const updated = prev.map(p =>
          p.ticker === upperTicker
            ? {
                ...p,
                shares: newShares,
                averageCost: newAvgCost,
                totalValue,
                totalCost,
                totalGain: totalValue - totalCost,
                totalGainPercent: ((totalValue - totalCost) / totalCost) * 100,
              }
            : p
        );
        savePositions(updated);
        addTransaction('buy', upperTicker, shares, avgCost);
        return updated;
      }

      const totalValue = shares * stockData.price;
      const totalCost = shares * avgCost;

      const newPosition: Position = {
        id: generateId(),
        ticker: upperTicker,
        shares,
        averageCost: avgCost,
        currentPrice: stockData.price,
        dayChange: stockData.change,
        dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
        totalValue,
        totalCost,
        totalGain: totalValue - totalCost,
        totalGainPercent: ((totalValue - totalCost) / totalCost) * 100,
        allocation: 0,
      };

      const updated = [...prev, newPosition];
      savePositions(updated);
      addTransaction('buy', upperTicker, shares, avgCost);
      return updated;
    });
  }, [addTransaction]);

  const updatePosition = useCallback((id: string, updates: Partial<Position>) => {
    setPositions(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, ...updates } : p));
      savePositions(updated);
      return updated;
    });
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions(prev => {
      const position = prev.find(p => p.id === id);
      if (position) {
        addTransaction('sell', position.ticker, position.shares, position.currentPrice);
      }
      const updated = prev.filter(p => p.id !== id);
      savePositions(updated);
      return updated;
    });
  }, [addTransaction]);

  const addToWatchlist = useCallback((ticker: string, targetPrice?: number) => {
    const upperTicker = ticker.toUpperCase();
    const stockData = getStockPrice(upperTicker);

    setWatchlist(prev => {
      if (prev.some(w => w.ticker === upperTicker)) return prev;

      const newItem: WatchlistItem = {
        id: generateId(),
        ticker: upperTicker,
        name: stockData.price > 0 ? upperTicker : ticker,
        currentPrice: stockData.price,
        dayChange: stockData.change,
        dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
        targetPrice,
      };

      const updated = [...prev, newItem];
      saveWatchlist(updated);
      return updated;
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist(prev => {
      const updated = prev.filter(w => w.id !== id);
      saveWatchlist(updated);
      return updated;
    });
  }, []);

  const markInsightRead = useCallback((id: string) => {
    setInsights(prev => {
      const updated = prev.map(i => (i.id === id ? { ...i, isRead: true } : i));
      saveInsights(updated);
      return updated;
    });
  }, []);

  const updateCashBalance = useCallback((amount: number, _reason: string) => {
    setCash(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        balance: prev.balance + amount,
        lastUpdated: new Date().toISOString(),
      };
      saveCashReserve(updated);
      return updated;
    });
  }, []);

  const refreshPrices = useCallback(() => {
    setPositions(prev => {
      const updated = prev.map(position => {
        const stockData = getStockPrice(position.ticker);
        const totalValue = position.shares * stockData.price;

        return {
          ...position,
          currentPrice: stockData.price,
          dayChange: stockData.change,
          dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
          totalValue,
          totalGain: totalValue - position.totalCost,
          totalGainPercent: ((totalValue - position.totalCost) / position.totalCost) * 100,
        };
      });
      savePositions(updated);
      return updated;
    });

    setWatchlist(prev => {
      const updated = prev.map(item => {
        const stockData = getStockPrice(item.ticker);
        return {
          ...item,
          currentPrice: stockData.price,
          dayChange: stockData.change,
          dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
        };
      });
      saveWatchlist(updated);
      return updated;
    });
  }, []);

  const getPositionMetrics = useCallback(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const dayChange = positions.reduce((sum, p) => sum + (p.dayChange * p.shares), 0);
    const dayChangePercent = (totalValue - dayChange) > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      dayChange,
      dayChangePercent,
    };
  }, [positions]);

  if (isLoading || !cash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <PortfolioContext.Provider
      value={{
        positions,
        watchlist,
        insights,
        cash,
        performance,
        transactions,
        isLoading,
        addPosition,
        updatePosition,
        removePosition,
        addToWatchlist,
        removeFromWatchlist,
        markInsightRead,
        updateCashBalance,
        refreshPrices,
        getPositionMetrics,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextType {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
