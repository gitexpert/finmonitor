import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Position, WatchlistItem, AIInsight, CashReserve, PerformanceData, Transaction } from '../types';
import type {
  DatabasePosition,
  DatabaseWatchlistItem,
  DatabaseCashLedger,
  DatabaseTransaction,
  DatabaseAIInsight,
  DatabasePortfolioHistory,
} from '../types/database';
import { getStockPrice, formatCurrency } from '../utils/mockData';

interface PortfolioContextType {
  positions: Position[];
  watchlist: WatchlistItem[];
  insights: AIInsight[];
  cash: CashReserve;
  performance: PerformanceData[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  addPosition: (ticker: string, shares: number, avgCost: number) => Promise<{ error: string | null }>;
  updatePosition: (id: string, updates: Partial<Position>) => Promise<{ error: string | null }>;
  removePosition: (id: string) => Promise<{ error: string | null }>;
  addToWatchlist: (ticker: string, targetPrice?: number) => Promise<{ error: string | null }>;
  removeFromWatchlist: (id: string) => Promise<{ error: string | null }>;
  markInsightRead: (id: string) => Promise<{ error: string | null }>;
  updateCashBalance: (amount: number, reason: string) => Promise<{ error: string | null }>;
  refreshData: () => Promise<void>;
  getPositionMetrics: () => {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange: number;
    dayChangePercent: number;
  };
  clearError: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

function mapPosition(db: DatabasePosition): Position {
  const stockData = getStockPrice(db.ticker);
  const currentPrice = stockData.price;
  const totalValue = db.shares * currentPrice;
  const totalCost = db.shares * db.avg_cost;
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    id: db.id,
    ticker: db.ticker,
    shares: db.shares,
    averageCost: db.avg_cost,
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

function mapWatchlistItem(db: DatabaseWatchlistItem): WatchlistItem {
  const stockData = getStockPrice(db.ticker);

  return {
    id: db.id,
    ticker: db.ticker,
    name: db.ticker,
    currentPrice: stockData.price,
    dayChange: stockData.change,
    dayChangePercent: (stockData.change / (stockData.price - stockData.change)) * 100,
    targetPrice: db.target_price ?? undefined,
    notes: db.notes ?? undefined,
  };
}

function mapTransaction(db: DatabaseTransaction): Transaction {
  return {
    id: db.id,
    type: db.type,
    ticker: db.ticker,
    shares: db.shares,
    price: db.price,
    total: db.total,
    timestamp: db.created_at,
    notes: db.notes ?? undefined,
  };
}

function mapInsight(db: DatabaseAIInsight): AIInsight {
  return {
    id: db.id,
    ticker: db.ticker,
    type: db.type,
    title: db.title,
    message: db.message,
    severity: db.severity,
    timestamp: db.created_at,
    isRead: db.is_read,
    actionRequired: db.action_required,
  };
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [cash, setCash] = useState<CashReserve>({
    id: 'default',
    name: 'Dry Powder',
    balance: 0,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
  });
  const [performance, setPerformance] = useState<PerformanceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [
        positionsResult,
        watchlistResult,
        cashResult,
        transactionsResult,
        insightsResult,
        historyResult,
      ] = await Promise.all([
        supabase.from('positions').select('*').eq('user_id', userId).eq('status', 'active'),
        supabase.from('watchlist').select('*').eq('user_id', userId),
        supabase.rpc('get_cash_balance', { p_user_id: userId }),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('ai_insights').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('portfolio_history').select('*').eq('user_id', userId).order('date', { ascending: true }).limit(30),
      ]);

      if (positionsResult.error) throw positionsResult.error;
      if (watchlistResult.error) throw watchlistResult.error;
      if (insightsResult.error) throw insightsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const mappedPositions = (positionsResult.data as DatabasePosition[]).map(mapPosition);
      const mappedWatchlist = (watchlistResult.data as DatabaseWatchlistItem[]).map(mapWatchlistItem);
      const mappedTransactions = (transactionsResult.data as DatabaseTransaction[]).map(mapTransaction);
      const mappedInsights = (insightsResult.data as DatabaseAIInsight[]).map(mapInsight);

      let cashBalance = 50000;
      if (cashResult.data !== null && cashResult.data !== undefined) {
        cashBalance = typeof cashResult.data === 'number' ? cashResult.data : 50000;
      } else {
        const ledgerResult = await supabase
          .from('cash_ledger')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (ledgerResult.data) {
          cashBalance = (ledgerResult.data as DatabaseCashLedger[]).reduce((sum, entry) => {
            const amount = entry.amount;
            if (entry.transaction_type === 'deposit' || entry.transaction_type === 'trade_sell') {
              return sum + amount;
            } else {
              return sum - amount;
            }
          }, 0);
        }
      }

      const mappedPerformance: PerformanceData[] = historyResult.data
        ? (historyResult.data as DatabasePortfolioHistory[]).map(h => ({
            date: h.date,
            value: h.total_value,
            change: h.daily_change ?? 0,
            changePercent: h.daily_change_percent ?? 0,
          }))
        : generateMockPerformance();

      setPositions(mappedPositions);
      setWatchlist(mappedWatchlist);
      setTransactions(mappedTransactions);
      setInsights(mappedInsights);
      setCash({
        id: 'primary',
        name: 'Dry Powder',
        balance: cashBalance,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      });
      setPerformance(mappedPerformance.length > 0 ? mappedPerformance : generateMockPerformance());
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const generateMockPerformance = (): PerformanceData[] => {
    const baseValue = 75000;
    const data: PerformanceData[] = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayVariation = Math.sin(i * 0.3) * 0.03 + Math.random() * 0.02 - 0.01;
      const value = baseValue * (1 + dayVariation + (30 - i) * 0.003);
      const prevValue = i === 30 ? baseValue : data[data.length - 1]?.value ?? baseValue;

      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100,
        change: Math.round((value - prevValue) * 100) / 100,
        changePercent: Math.round(((value - prevValue) / prevValue) * 10000) / 100,
      });
    }

    return data;
  };

  const addPosition = async (ticker: string, shares: number, avgCost: number): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    const upperTicker = ticker.toUpperCase();
    const totalCost = shares * avgCost;

    if (totalCost > cash.balance) {
      return { error: `Insufficient cash. Need ${formatCurrency(totalCost)} but only have ${formatCurrency(cash.balance)}` };
    }

    try {
      const existingPosition = positions.find(p => p.ticker === upperTicker);

      if (existingPosition) {
        const newShares = existingPosition.shares + shares;
        const newAvgCost = ((existingPosition.averageCost * existingPosition.shares) + (avgCost * shares)) / newShares;

        const { error: updateError } = await supabase
          .from('positions')
          .update({ shares: newShares, avg_cost: newAvgCost })
          .eq('id', existingPosition.id);

        if (updateError) return { error: updateError.message };
      } else {
        const { error: insertError } = await supabase.from('positions').insert({
          user_id: userId,
          ticker: upperTicker,
          shares,
          avg_cost: avgCost,
          status: 'active',
        } as never);

        if (insertError) return { error: insertError.message };
      }

      await supabase.from('cash_ledger').insert({
        user_id: userId,
        amount: totalCost,
        transaction_type: 'trade_buy',
        description: `Bought ${shares} shares of ${upperTicker} @ ${formatCurrency(avgCost)}`,
        ticker: upperTicker,
        shares,
        price: avgCost,
      } as never);

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'buy',
        ticker: upperTicker,
        shares,
        price: avgCost,
        total: totalCost,
      } as never);

      await fetchAllData();
      return { error: null };
    } catch (err) {
      return { error: 'Failed to add position' };
    }
  };

  const updatePosition = async (id: string, updates: Partial<Position>): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.shares !== undefined) updateData.shares = updates.shares;
      if (updates.averageCost !== undefined) updateData.avg_cost = updates.averageCost;

      const { error: updateError } = await supabase
        .from('positions')
        .update(updateData)
        .eq('id', id);

      if (updateError) return { error: updateError.message };
      await fetchAllData();
      return { error: null };
    } catch (err) {
      return { error: 'Failed to update position' };
    }
  };

  const removePosition = async (id: string): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const position = positions.find(p => p.id === id);
      if (!position) return { error: 'Position not found' };

      const { error: updateError } = await supabase
        .from('positions')
        .update({ status: 'sold', closed_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) return { error: updateError.message };

      const saleTotal = position.shares * position.currentPrice;

      await supabase.from('cash_ledger').insert({
        user_id: userId,
        amount: saleTotal,
        transaction_type: 'trade_sell',
        description: `Sold ${position.shares} shares of ${position.ticker} @ ${formatCurrency(position.currentPrice)}`,
        ticker: position.ticker,
        shares: position.shares,
        price: position.currentPrice,
      } as never);

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'sell',
        ticker: position.ticker,
        shares: position.shares,
        price: position.currentPrice,
        total: saleTotal,
      } as never);

      await fetchAllData();
      return { error: null };
    } catch (err) {
      return { error: 'Failed to sell position' };
    }
  };

  const addToWatchlist = async (ticker: string, targetPrice?: number): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    const upperTicker = ticker.toUpperCase();

    if (watchlist.some(w => w.ticker === upperTicker)) {
      return { error: 'Ticker already in watchlist' };
    }

    try {
      const { error: insertError } = await supabase.from('watchlist').insert({
        user_id: userId,
        ticker: upperTicker,
        target_price: targetPrice ?? null,
      } as never);

      if (insertError) return { error: insertError.message };
      await fetchAllData();
      return { error: null };
    } catch (err) {
      return { error: 'Failed to add to watchlist' };
    }
  };

  const removeFromWatchlist = async (id: string): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const { error: deleteError } = await supabase.from('watchlist').delete().eq('id', id);

      if (deleteError) return { error: deleteError.message };
      await fetchAllData();
      return { error: null };
    } catch (err) {
      return { error: 'Failed to remove from watchlist' };
    }
  };

  const markInsightRead = async (id: string): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', id);

      if (updateError) return { error: updateError.message };

      setInsights(prev => prev.map(i => (i.id === id ? { ...i, isRead: true } : i)));
      return { error: null };
    } catch (err) {
      return { error: 'Failed to mark insight as read' };
    }
  };

  const updateCashBalance = async (amount: number, reason: string): Promise<{ error: string | null }> => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      const transactionType = amount > 0 ? 'deposit' : 'withdrawal';
      const absAmount = Math.abs(amount);

      if (transactionType === 'withdrawal' && absAmount > cash.balance) {
        return { error: 'Insufficient balance' };
      }

      const { error: insertError } = await supabase.from('cash_ledger').insert({
        user_id: userId,
        amount: absAmount,
        transaction_type: transactionType,
        description: reason,
      } as never);

      if (insertError) return { error: insertError.message };

      if (transactionType === 'deposit') {
        setCash(prev => ({
          ...prev,
          balance: prev.balance + absAmount,
          lastUpdated: new Date().toISOString(),
        }));
      } else {
        setCash(prev => ({
          ...prev,
          balance: prev.balance - absAmount,
          lastUpdated: new Date().toISOString(),
        }));
      }

      return { error: null };
    } catch (err) {
      return { error: 'Failed to update cash balance' };
    }
  };

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

  const clearError = () => setError(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-slate-400">Loading portfolio...</p>
        </div>
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
        error,
        addPosition,
        updatePosition,
        removePosition,
        addToWatchlist,
        removeFromWatchlist,
        markInsightRead,
        updateCashBalance,
        refreshData: fetchAllData,
        getPositionMetrics,
        clearError,
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
