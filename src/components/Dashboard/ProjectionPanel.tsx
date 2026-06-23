import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { Position } from '../../types';
import { formatCurrency } from '../../utils/mockData';

interface ProjectionPanelProps {
  positions: Position[];
  cashBalance: number;
}

interface BetaData {
  ticker: string;
  beta: number;
  weight: number;
  weightedBeta: number;
  sector: string;
}

// Mock sector betas and volatilities
const SECTOR_BETAS: Record<string, { beta: number; name: string }> = {
  TECHNOLOGY: { beta: 1.25, name: 'Technology' },
  SEMICONDUCTOR: { beta: 1.52, name: 'Semiconductors' },
  SOFTWARE: { beta: 1.18, name: 'Software' },
  FINTECH: { beta: 1.35, name: 'FinTech' },
  AEROSPACE: { beta: 1.08, name: 'Aerospace & Defense' },
  CONSUMER: { beta: 0.92, name: 'Consumer' },
  HEALTHCARE: { beta: 1.05, name: 'Healthcare' },
  DEFAULT: { beta: 1.0, name: 'Market' },
};

const TICKER_SECTORS: Record<string, string> = {
  NVDA: 'SEMICONDUCTOR',
  AMD: 'SEMICONDUCTOR',
  MU: 'SEMICONDUCTOR',
  PLTR: 'SOFTWARE',
  SOFI: 'FINTECH',
  COIN: 'FINTECH',
  RKLB: 'AEROSPACE',
  VRT: 'TECHNOLOGY',
  TSLA: 'TECHNOLOGY',
  AAPL: 'TECHNOLOGY',
  MSFT: 'SOFTWARE',
  META: 'TECHNOLOGY',
};

type ScenarioType = 'recession' | 'correction' | 'neutral' | 'bull' | 'custom';

const SCENARIOS: Record<ScenarioType, { name: string; change: number; description: string }> = {
  recession: { name: 'Recession', change: -30, description: 'Broad market sell-off' },
  correction: { name: 'Correction', change: -15, description: 'Market pullback' },
  neutral: { name: 'Flat Market', change: 0, description: 'No macro movement' },
  bull: { name: 'Bull Run', change: 20, description: 'Market rally' },
  custom: { name: 'Custom', change: -10, description: 'User-defined scenario' },
};

export default function ProjectionPanel({ positions, cashBalance }: ProjectionPanelProps) {
  const [scenario, setScenario] = useState<ScenarioType>('correction');
  const [customChange, setCustomChange] = useState(-10);

  const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0) + cashBalance;

  const betaAnalysis = useMemo(() => {
    if (positions.length === 0) {
      return {
        betaData: [],
        portfolioBeta: 1.0,
        projectedChange: 0,
        valueAtRisk: 0,
        projectedValue: totalValue,
      };
    }

    // Calculate weighted beta for each position
    const equityValue = positions.reduce((sum, p) => sum + p.totalValue, 0);

    const betaData: BetaData[] = positions.map(pos => {
      const sector = TICKER_SECTORS[pos.ticker] || 'DEFAULT';
      const beta = SECTOR_BETAS[sector]?.beta || 1.0;
      const weight = pos.totalValue / equityValue;
      const weightedBeta = beta * weight;

      return {
        ticker: pos.ticker,
        beta,
        weight: weight * 100,
        weightedBeta,
        sector: SECTOR_BETAS[sector]?.name || 'Market',
      };
    });

    const portfolioBeta = betaData.reduce((sum, b) => sum + b.weightedBeta, 0);

    // Adjust for cash (beta = 0 for cash component)
    const cashWeight = cashBalance / totalValue;
    const adjustedPortfolioBeta = portfolioBeta * (1 - cashWeight) + 0 * cashWeight;

    // Calculate projected change based on scenario and beta
    const marketChange = scenario === 'custom' ? customChange : SCENARIOS[scenario].change;
    const projectedChange = adjustedPortfolioBeta * marketChange;
    const valueAtRisk = (projectedChange / 100) * totalValue;
    const projectedValue = totalValue + valueAtRisk;

    return {
      betaData,
      portfolioBeta: adjustedPortfolioBeta,
      projectedChange,
      valueAtRisk,
      projectedValue,
      marketChange,
    };
  }, [positions, cashBalance, scenario, customChange, totalValue]);

  // Generate projection chart data
  const projectionChartData = useMemo(() => {
    const data = [];
    const currentPrice = 100;
    const projectionDays = 30;

    for (let day = 0; day <= projectionDays; day++) {
      const progress = day / projectionDays;
      const baseChange = betaAnalysis.projectedChange * progress;
      const noise = (Math.random() - 0.5) * 2 * progress;
      const marketChange = betaAnalysis.marketChange ?? 0;

      data.push({
        day: `Day ${day}`,
        current: currentPrice,
        projected: currentPrice * (1 + (baseChange + noise) / 100),
        baseline: currentPrice * (1 + (marketChange * progress) / 100),
      });
    }

    return data;
  }, [betaAnalysis]);

  // Calculate individual position projections
  const positionProjections = useMemo(() => {
    return positions.map(pos => {
      const sector = TICKER_SECTORS[pos.ticker] || 'DEFAULT';
      const beta = SECTOR_BETAS[sector]?.beta || 1.0;
      const marketChange = scenario === 'custom' ? customChange : SCENARIOS[scenario].change;
      const expectedChange = beta * marketChange;
      const projectedValue = pos.totalValue * (1 + expectedChange / 100);

      return {
        ticker: pos.ticker,
        currentValue: pos.totalValue,
        projectedValue,
        expectedChange,
        beta,
      };
    });
  }, [positions, scenario, customChange]);

  const currentScenario = scenario === 'custom'
    ? { ...SCENARIOS.custom, change: customChange }
    : SCENARIOS[scenario];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ai/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-ai" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Macro Projection</h3>
          <p className="text-sm text-slate-400">Beta-weighted scenario analysis</p>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="mb-6">
        <label className="input-label">Scenario</label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {(Object.keys(SCENARIOS) as ScenarioType[]).map((key) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                scenario === key
                  ? key === 'recession'
                    ? 'bg-loss/30 text-loss border border-loss/40'
                    : key === 'correction'
                    ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                    : key === 'bull'
                    ? 'bg-gain/30 text-gain border border-gain/40'
                    : key === 'custom'
                    ? 'bg-ai/30 text-ai border border-ai/40'
                    : 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {SCENARIOS[key].name}
            </button>
          ))}
        </div>

        {scenario === 'custom' && (
          <div className="mt-3">
            <label className="input-label">Custom Market Change (%)</label>
            <input
              type="range"
              min="-50"
              max="50"
              value={customChange}
              onChange={e => setCustomChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-ai"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-loss">-50%</span>
              <span className={`font-semibold text-base ${
                customChange < 0 ? 'text-loss' : customChange > 0 ? 'text-gain' : 'text-slate-400'
              }`}>
                {customChange > 0 ? '+' : ''}{customChange}%
              </span>
              <span className="text-gain">+50%</span>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-800/30">
          <p className="text-sm text-slate-400 mb-1">Portfolio Beta</p>
          <p className="text-2xl font-bold text-white">{betaAnalysis.portfolioBeta.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {betaAnalysis.portfolioBeta > 1 ? 'More volatile than market' :
             betaAnalysis.portfolioBeta < 1 ? 'Less volatile than market' : 'Matches market volatility'}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${
          betaAnalysis.projectedChange >= 0 ? 'bg-gain/10' : 'bg-loss/10'
        }`}>
          <p className="text-sm text-slate-400 mb-1">Projected Change</p>
          <p className={`text-2xl font-bold ${
            betaAnalysis.projectedChange >= 0 ? 'text-gain' : 'text-loss'
          }`}>
            {betaAnalysis.projectedChange >= 0 ? '+' : ''}{betaAnalysis.projectedChange.toFixed(2)}%
          </p>
          <p className={`text-xs mt-1 ${
            betaAnalysis.projectedChange >= 0 ? 'text-gain/80' : 'text-loss/80'
          }`}>
            {formatCurrency(Math.abs(betaAnalysis.valueAtRisk))} {
              betaAnalysis.projectedChange >= 0 ? 'potential gain' : 'at risk'
            }
          </p>
        </div>
      </div>

      {/* Value Impact */}
      <div className="p-4 rounded-xl bg-slate-800/50 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Projected Portfolio Value</span>
          <span className={`text-sm ${
            betaAnalysis.projectedChange >= 0 ? 'text-gain' : 'text-loss'
          }`}>
            {currentScenario.name} scenario
          </span>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold text-white">{formatCurrency(betaAnalysis.projectedValue)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Current: {formatCurrency(totalValue)}
            </p>
          </div>
          <div className={`flex items-center gap-1 pb-1 ${
            betaAnalysis.projectedChange >= 0 ? 'text-gain' : 'text-loss'
          }`}>
            {betaAnalysis.projectedChange >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <span className="font-semibold">
              {formatCurrency(Math.abs(betaAnalysis.valueAtRisk))}
            </span>
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="h-40 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="day"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs">
                      <p className="text-slate-400">{data.day}</p>
                      <p className="text-white">Projected: ${(data.projected).toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="base"
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke={betaAnalysis.projectedChange >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Position Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-3">Position Impact</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {positionProjections.map((proj) => (
            <div key={proj.ticker} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-white w-12">{proj.ticker}</span>
                <span className="text-xs text-slate-500">beta {proj.beta.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">{formatCurrency(proj.projectedValue)}</p>
                <p className={`text-xs ${
                  proj.expectedChange >= 0 ? 'text-gain' : 'text-loss'
                }`}>
                  {proj.expectedChange >= 0 ? '+' : ''}{proj.expectedChange.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-500 text-center mt-4">
        Projections are based on historical beta estimates and simplified assumptions.
        Not financial advice.
      </p>
    </div>
  );
}
