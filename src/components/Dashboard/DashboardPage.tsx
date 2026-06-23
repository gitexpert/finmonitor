import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Wallet, PieChart } from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import MetricCard from './MetricCard';
import PerformanceChart from './PerformanceChart';
import PositionsTable from './PositionsTable';
import AIInsightsPanel from '../AIInsights/AIInsightsPanel';

export default function DashboardPage() {
  const { positions, performance, insights, cash, getPositionMetrics, refreshData, markInsightRead, error, clearError } = usePortfolio();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    refreshData().finally(() => setIsLoading(false));
  }, []);

  const metrics = getPositionMetrics();
  const totalPortfolioValue = metrics.totalValue + cash.balance;

  const handleRefresh = async () => {
    setIsLoading(true);
    clearError();
    await refreshData();
    setIsLoading(false);
  };

  const topPosition = positions.reduce<[string, number]>(
    (highest, pos) => (pos.totalGainPercent > highest[1] ? [pos.ticker, pos.totalGainPercent] : highest),
    ['', 0]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Track your portfolio performance</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-loss hover:text-loss-light text-sm">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Value"
          value={`$${totalPortfolioValue.toLocaleString()}`}
          change={metrics.dayChangePercent}
          changeLabel="Today"
          icon={<PieChart className="w-6 h-6" />}
          iconBgClass="bg-accent/20"
          iconColorClass="text-accent"
          isLoading={isLoading}
        />
        <MetricCard
          title="Equity Value"
          value={`$${metrics.totalValue.toLocaleString()}`}
          change={metrics.totalGainPercent}
          changeLabel="All time"
          icon={<TrendingUp className="w-6 h-6" />}
          iconBgClass="bg-gain/20"
          iconColorClass="text-gain"
          isLoading={isLoading}
        />
        <MetricCard
          title="Dry Powder"
          value={`$${cash.balance.toLocaleString()}`}
          changeLabel="Cash available"
          icon={<Wallet className="w-6 h-6" />}
          iconBgClass="bg-ai/20"
          iconColorClass="text-ai"
          isLoading={isLoading}
        />
        <MetricCard
          title="Day Change"
          value={`${metrics.dayChange >= 0 ? '+' : ''}$${Math.abs(metrics.dayChange).toFixed(2)}`}
          change={metrics.dayChangePercent}
          changeLabel={metrics.dayChange >= 0 ? 'Gain' : 'Loss'}
          icon={<DollarSign className="w-6 h-6" />}
          iconBgClass={metrics.dayChange >= 0 ? 'bg-gain/20' : 'bg-loss/20'}
          iconColorClass={metrics.dayChange >= 0 ? 'text-gain' : 'text-loss'}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart data={performance} isLoading={isLoading} />
        </div>
        <div>
          <AIInsightsPanel insights={insights} onMarkRead={markInsightRead} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PositionsTable positions={positions.slice(0, 6)} />
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {positions.length > 0 && (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-gain/10">
                  <div>
                    <p className="text-sm text-slate-400">Top Performer</p>
                    <p className="text-lg font-semibold text-white">{topPosition[0] || 'N/A'}</p>
                  </div>
                  {topPosition[1] > 0 && (
                    <span className="badge-gain">+{topPosition[1].toFixed(2)}%</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
                  <div>
                    <p className="text-sm text-slate-400">Positions Value</p>
                    <p className="text-lg font-semibold text-white">
                      ${metrics.totalValue.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-slate-400">
                    {positions.length} positions
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
                  <div>
                    <p className="text-sm text-slate-400">Allocation</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-sm text-slate-400">
                          Equity {((metrics.totalValue / totalPortfolioValue) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-ai" />
                        <span className="text-sm text-slate-400">
                          Cash {((cash.balance / totalPortfolioValue) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
