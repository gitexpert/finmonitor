import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { PerformanceData } from '../../types';

interface PerformanceChartProps {
  data: PerformanceData[];
  isLoading?: boolean;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

export default function PerformanceChart({ data, isLoading = false }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1D':
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return data.filter(d => new Date(d.date) >= startDate);
  };

  const filteredData = getFilteredData();
  const latestValue = filteredData[filteredData.length - 1]?.value || 0;
  const firstValue = filteredData[0]?.value || 0;
  const totalChange = latestValue - firstValue;
  const totalChangePercent = firstValue > 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;
  const isPositive = totalChange >= 0;

  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PerformanceData }[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card p-3 text-sm">
          <p className="text-slate-400 mb-1">{data.date}</p>
          <p className="font-semibold text-white">${data.value.toLocaleString()}</p>
          {data.changePercent !== 0 && (
            <p className={`text-xs ${data.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Portfolio Performance</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white">
              ${latestValue.toLocaleString()}
            </span>
            <span className={`text-sm font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}{totalChange.toLocaleString()} ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-800/50 rounded-xl p-1">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-accent text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => setChartType(chartType === 'area' ? 'line' : 'area')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {chartType === 'area' ? 'Line' : 'Area'}
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          ) : (
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? '#10b981' : '#ef4444' }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
