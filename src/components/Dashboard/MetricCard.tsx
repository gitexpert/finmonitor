import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  isLoading?: boolean;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBgClass = 'bg-accent/20',
  iconColorClass = 'text-accent',
  isLoading = false,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNeutral = change === 0;

  return (
    <div className="metric-card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBgClass} flex items-center justify-center`}>
          <span className={iconColorClass}>{icon}</span>
        </div>
        {change !== undefined && !isLoading && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isNeutral ? 'text-slate-400' : isPositive ? 'text-gain' : 'text-loss'
            }`}
          >
            {isNeutral ? (
              <Minus className="w-4 h-4" />
            ) : isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isPositive && change > 0 ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-8 w-32" />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {changeLabel && <p className="text-xs text-slate-500 mt-1">{changeLabel}</p>}
        </>
      )}
    </div>
  );
}
