import { useMemo } from 'react';
import { PieChart, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import type { Position } from '../../types';
import { formatCurrency } from '../../utils/mockData';

interface AllocationMatrixProps {
  positions: Position[];
  cashBalance: number;
}

interface AllocationData {
  ticker: string;
  value: number;
  percent: number;
  color: string;
  isOverweight: boolean;
  deviation: number;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
];

// Standard sector benchmarks for concentration
const CONCENTRATION_THRESHOLDS = {
  LOW: 5,
  MODERATE: 15,
  HIGH: 25,
  EXTREME: 40,
};

export default function AllocationMatrix({ positions, cashBalance }: AllocationMatrixProps) {
  const analysis = useMemo(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
    const portfolioValue = totalValue + cashBalance;

    // Sort positions by value descending
    const sortedPositions = [...positions].sort((a, b) => b.totalValue - a.totalValue);

    // Calculate allocation data
    const allocations: AllocationData[] = sortedPositions.map((pos, idx) => {
      const percent = (pos.totalValue / portfolioValue) * 100;
      return {
        ticker: pos.ticker,
        value: pos.totalValue,
        percent,
        color: COLORS[idx % COLORS.length],
        isOverweight: percent > CONCENTRATION_THRESHOLDS.HIGH,
        deviation: percent > CONCENTRATION_THRESHOLDS.HIGH
          ? percent - CONCENTRATION_THRESHOLDS.HIGH
          : 0,
      };
    });

    // Add cash allocation
    const cashPercent = (cashBalance / portfolioValue) * 100;
    if (cashPercent > 0) {
      allocations.push({
        ticker: 'CASH',
        value: cashBalance,
        percent: cashPercent,
        color: '#64748b',
        isOverweight: false,
        deviation: 0,
      });
    }

    // Calculate concentration index (Herfindahl-Hirschman Index)
    const hhi = allocations.reduce((sum, a) => sum + Math.pow(a.percent, 2), 0);

    // Calculate effective number of positions (inverse of HHI)
    const effectivePositions = 10000 / hhi;

    // Largest position percentage
    const largestPosition = allocations[0]?.percent || 0;

    // Top 3 concentration
    const top3Concentration = allocations.slice(0, 3).reduce((sum, a) => sum + a.percent, 0);

    // Diversification score (0-100)
    const diversificationScore = Math.min(100, Math.max(0,
      100 - (hhi / 100) + (cashPercent > 10 ? 10 : 0)
    ));

    // Concentration risk level
    let concentrationRisk: 'low' | 'moderate' | 'high' | 'extreme';
    if (hhi < 1500) {
      concentrationRisk = 'low';
    } else if (hhi < 2500) {
      concentrationRisk = 'moderate';
    } else if (hhi < 4000) {
      concentrationRisk = 'high';
    } else {
      concentrationRisk = 'extreme';
    }

    // Cash firepower ratio
    const cashRatio = cashBalance / portfolioValue;
    const cashHealth = cashRatio > 0.15 ? 'healthy' : cashRatio > 0.05 ? 'adequate' : 'depleted';

    return {
      allocations,
      hhi,
      effectivePositions,
      largestPosition,
      top3Concentration,
      diversificationScore,
      concentrationRisk,
      cashHealth,
      cashRatio,
      portfolioValue,
      equityValue: totalValue,
      positionCount: positions.length,
    };
  }, [positions, cashBalance]);

  const getRiskColor = (risk: 'low' | 'moderate' | 'high' | 'extreme') => {
    switch (risk) {
      case 'low': return 'text-gain';
      case 'moderate': return 'text-amber-400';
      case 'high': return 'text-orange-400';
      case 'extreme': return 'text-loss';
    }
  };

  const getRiskBg = (risk: 'low' | 'moderate' | 'high' | 'extreme') => {
    switch (risk) {
      case 'low': return 'bg-gain/20';
      case 'moderate': return 'bg-amber-500/20';
      case 'high': return 'bg-orange-500/20';
      case 'extreme': return 'bg-loss/20';
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Allocation Matrix</h3>
          <p className="text-sm text-slate-400">Portfolio concentration analysis</p>
        </div>
      </div>

      {/* Concentration Index Score */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">Concentration Index</span>
          <span className={`font-semibold capitalize ${getRiskColor(analysis.concentrationRisk)}`}>
            {analysis.concentrationRisk} Risk
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getRiskBg(analysis.concentrationRisk)}`}
                style={{ width: `${Math.min(100, analysis.hhi / 50)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Diversified</span>
              <span>Concentrated</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{analysis.hhi.toFixed(0)}</p>
            <p className="text-xs text-slate-500">HHI Score</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-800/30">
          <p className="text-sm text-slate-400 mb-1">Effective Positions</p>
          <p className="text-xl font-bold text-white">{analysis.effectivePositions.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-1">Inversely related to HHI</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30">
          <p className="text-sm text-slate-400 mb-1">Diversification Score</p>
          <p className="text-xl font-bold text-white">{analysis.diversificationScore.toFixed(0)}/100</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30">
          <p className="text-sm text-slate-400 mb-1">Top 3 Holdings</p>
          <p className="text-xl font-bold text-white">{analysis.top3Concentration.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30">
          <p className="text-sm text-slate-400 mb-1">Largest Position</p>
          <p className={`text-xl font-bold ${analysis.largestPosition > 25 ? 'text-amber-400' : 'text-white'}`}>
            {analysis.largestPosition.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Position Allocation</h4>
        <div className="space-y-2">
          {analysis.allocations.slice(0, 8).map((allocation) => (
            <div key={allocation.ticker} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: allocation.color }}
                  />
                  <span className="font-medium text-white text-sm">{allocation.ticker}</span>
                  {allocation.isOverweight && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Overweight
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">{allocation.percent.toFixed(1)}%</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {formatCurrency(allocation.value)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                  style={{
                    width: `${Math.min(100, allocation.percent * 2)}%`,
                    backgroundColor: allocation.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Allocation */}
      <div className="p-4 rounded-xl border border-dashed border-slate-700 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-white">Cash Reserve</p>
              <p className="text-xs text-slate-500">Dry powder for opportunities</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">{formatCurrency(cashBalance)}</p>
            <p className={`text-xs ${
              analysis.cashHealth === 'healthy' ? 'text-gain' :
              analysis.cashHealth === 'adequate' ? 'text-amber-400' : 'text-loss'
            }`}>
              {(analysis.cashRatio * 100).toFixed(1)}% - {analysis.cashHealth}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={`p-4 rounded-xl ${getRiskBg(analysis.concentrationRisk)}`}>
        <div className="flex items-start gap-3">
          {analysis.concentrationRisk === 'low' ? (
            <CheckCircle className="w-5 h-5 text-gain mt-0.5" />
          ) : (
            <AlertTriangle className={`w-5 h-5 ${getRiskColor(analysis.concentrationRisk)} mt-0.5`} />
          )}
          <div>
            <p className={`font-medium ${getRiskColor(analysis.concentrationRisk)}`}>
              {analysis.concentrationRisk === 'low' ? 'Well Diversified' :
               analysis.concentrationRisk === 'moderate' ? 'Moderate Concentration' :
               analysis.concentrationRisk === 'high' ? 'High Concentration Risk' : 'Extreme Concentration'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {analysis.concentrationRisk === 'low' &&
                'Your portfolio is well-diversified with no single position dominating.'}
              {analysis.concentrationRisk === 'moderate' &&
                'Consider rebalancing if any position exceeds 15% of your portfolio.'}
              {analysis.concentrationRisk === 'high' &&
                'One or more positions are significantly overweight. Consider trimming.'}
              {analysis.concentrationRisk === 'extreme' &&
                'Your portfolio is highly concentrated. Consider diversification to manage risk.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
