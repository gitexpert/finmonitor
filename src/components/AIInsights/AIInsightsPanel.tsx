import { useState } from 'react';
import {
  AlertTriangle,
  Target,
  TrendingUp,
  Bell,
  Check,
  AlertCircle,
  DollarSign,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { AIInsight } from '../../types';
import { timeAgo } from '../../utils/mockData';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  onMarkRead?: (id: string) => Promise<{ error: string | null }>;
}

const getInsightIcon = (type: AIInsight['type']) => {
  switch (type) {
    case 'alert':
      return AlertCircle;
    case 'opportunity':
      return Target;
    case 'volatility':
      return TrendingUp;
    case 'earnings':
      return DollarSign;
    case 'target':
      return Target;
    default:
      return Bell;
  }
};

const getInsightColor = (severity: AIInsight['severity']) => {
  switch (severity) {
    case 'high':
      return {
        bg: 'bg-loss/20',
        border: 'border-loss/30',
        icon: 'text-loss',
        badge: 'bg-loss/30 text-loss',
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        icon: 'text-amber-400',
        badge: 'bg-amber-500/30 text-amber-400',
      };
    case 'low':
      return {
        bg: 'bg-gain/10',
        border: 'border-gain/30',
        icon: 'text-gain',
        badge: 'bg-gain/30 text-gain',
      };
    default:
      return {
        bg: 'bg-ai/10',
        border: 'border-ai/30',
        icon: 'text-ai',
        badge: 'bg-ai/30 text-ai',
      };
  }
};

const getTypeLabel = (type: AIInsight['type']) => {
  switch (type) {
    case 'alert':
      return 'Alert';
    case 'opportunity':
      return 'Opportunity';
    case 'volatility':
      return 'Volatility';
    case 'earnings':
      return 'Earnings';
    case 'target':
      return 'Target';
    default:
      return 'Insight';
  }
};

export default function AIInsightsPanel({ insights, onMarkRead }: AIInsightsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const unreadCount = insights.filter(i => !i.isRead).length;
  const displayInsights = showAll ? insights : insights.slice(0, 4);

  const handleMarkRead = async (id: string) => {
    if (!onMarkRead) return;

    setMarkingAsRead(id);
    await onMarkRead(id);
    setMarkingAsRead(null);
  };

  if (insights.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-ai" />
          <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-400">No insights available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden ai-glow">
      <div className="px-6 py-4 border-b border-ai/20 bg-ai/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ai" />
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
          </div>
          {unreadCount > 0 && (
            <span className="badge-ai">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800/50">
        {displayInsights.map(insight => {
          const Icon = getInsightIcon(insight.type);
          const colors = getInsightColor(insight.severity);

          return (
            <div
              key={insight.id}
              className={`p-4 transition-all duration-200 ${
                insight.isRead
                  ? 'bg-transparent opacity-70'
                  : `${colors.bg} hover:bg-opacity-70`
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{insight.ticker}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {getTypeLabel(insight.type)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {timeAgo(insight.timestamp)}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-white mb-1">{insight.title}</h4>
                  <p className="text-sm text-slate-400 line-clamp-2">{insight.message}</p>

                  {!insight.isRead && onMarkRead && (
                    <button
                      onClick={() => handleMarkRead(insight.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-ai hover:text-ai-light transition-colors disabled:opacity-50"
                      disabled={markingAsRead === insight.id}
                    >
                      {markingAsRead === insight.id ? (
                        <span className="flex items-center gap-1">
                          <span className="loading-spinner w-3 h-3" />
                          Marking...
                        </span>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          Mark as read
                        </>
                      )}
                    </button>
                  )}

                  {insight.actionRequired && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Action required
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > 4 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-6 py-3 border-t border-ai/20 bg-ai/5 flex items-center justify-center gap-2 text-sm font-medium text-ai hover:bg-ai/10 transition-colors"
        >
          View all {insights.length} insights
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <div className="px-6 py-3 border-t border-ai/20 bg-ai/5">
        <p className="text-xs text-center text-slate-500">
          AI-powered insights are informational and not financial advice
        </p>
      </div>
    </div>
  );
}
