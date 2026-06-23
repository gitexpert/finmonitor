import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Eye, Plus, X, Target, Trash2 } from 'lucide-react';
import type { WatchlistItem } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/mockData';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  onAdd?: (ticker: string, targetPrice?: number) => void;
  onRemove?: (id: string) => void;
  showAdd?: boolean;
}

export default function WatchlistPanel({
  watchlist,
  onAdd,
  onRemove,
  showAdd = false,
}: WatchlistPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');

  const handleAdd = () => {
    if (newTicker.trim()) {
      onAdd?.(newTicker.trim().toUpperCase(), newTargetPrice ? parseFloat(newTargetPrice) : undefined);
      setNewTicker('');
      setNewTargetPrice('');
      setIsAdding(false);
    }
  };

  const calculateDistanceToTarget = (item: WatchlistItem) => {
    if (!item.targetPrice) return null;
    const distance = ((item.targetPrice - item.currentPrice) / item.currentPrice) * 100;
    return distance;
  };

  if (watchlist.length === 0 && !showAdd) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-white">Watchlist</h3>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">Your watchlist is empty</p>
          <p className="text-sm text-slate-500">Add tickers to track potential opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-white">Watchlist</h3>
          </div>
          {showAdd && (
            <button
              onClick={() => setIsAdding(true)}
              className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800/50">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={newTicker}
              onChange={e => setNewTicker(e.target.value.toUpperCase())}
              className="input-field text-center font-mono"
              placeholder="TICKER"
              autoFocus
              maxLength={5}
            />
            <input
              type="number"
              value={newTargetPrice}
              onChange={e => setNewTargetPrice(e.target.value)}
              className="input-field text-right"
              placeholder="Target $"
              step="0.01"
              min="0"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary flex-1 text-sm">
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewTicker('');
                  setNewTargetPrice('');
                }}
                className="btn-secondary px-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-800/50">
        {watchlist.map(item => {
          const distanceToTarget = calculateDistanceToTarget(item);

          return (
            <div key={item.id} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {item.ticker.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{item.ticker}</div>
                    <div className="text-xs text-slate-500 truncate max-w-32">
                      {item.name}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      {formatCurrency(item.currentPrice)}
                    </div>
                    <div className={`text-xs flex items-center justify-end gap-1 ${
                      item.dayChangePercent >= 0 ? 'text-gain' : 'text-loss'
                    }`}>
                      {item.dayChangePercent >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {formatPercent(item.dayChangePercent)}
                    </div>
                  </div>

                  {item.targetPrice && distanceToTarget !== null && (
                    <div className="hidden sm:block text-right">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Target className="w-3 h-3" />
                        {formatCurrency(item.targetPrice)}
                      </div>
                      <div className={`text-xs ${distanceToTarget <= 5 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {distanceToTarget >= 0 ? '+' : ''}{distanceToTarget.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  {onRemove && (
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-loss hover:bg-loss/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isAdding && watchlist.length === 0 && showAdd && (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-400 mb-2">No tickers on your watchlist</p>
          <button
            onClick={() => setIsAdding(true)}
            className="text-accent hover:text-accent-light transition-colors text-sm font-medium"
          >
            Add your first ticker
          </button>
        </div>
      )}
    </div>
  );
}
