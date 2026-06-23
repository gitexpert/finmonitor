import { useState } from 'react';
import { Plus, TrendingUp, Percent, DollarSign, Package, X, Loader2 } from 'lucide-react';
import type { Position } from '../../types';
import { formatCurrency, formatCompactCurrency } from '../../utils/mockData';

interface PositionManagerProps {
  positions: Position[];
  cashBalance: number;
  onAddPosition: (ticker: string, shares: number, avgCost: number) => Promise<{ error: string | null }>;
  onUpdatePosition: (id: string, updates: Partial<Position>) => Promise<{ error: string | null }>;
  onRemovePosition: (id: string) => Promise<{ error: string | null }>;
}

interface PositionFormData {
  ticker: string;
  shares: string;
  avgCost: string;
}

export default function PositionManager({
  positions,
  cashBalance,
  onAddPosition,
  onUpdatePosition,
  onRemovePosition,
}: PositionManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<PositionFormData>({
    ticker: '',
    shares: '',
    avgCost: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
  const totalGain = positions.reduce((sum, p) => sum + p.totalGain, 0);
  const dayChange = positions.reduce((sum, p) => sum + (p.dayChange * p.shares), 0);

  const validateForm = (): boolean => {
    if (!formData.ticker.trim()) {
      setError('Ticker is required');
      return false;
    }

    if (!/^[A-Z]{1,5}$/.test(formData.ticker.toUpperCase())) {
      setError('Ticker must be 1-5 letters');
      return false;
    }

    const shares = parseFloat(formData.shares);
    if (isNaN(shares) || shares <= 0) {
      setError('Shares must be a positive number');
      return false;
    }

    const avgCost = parseFloat(formData.avgCost);
    if (isNaN(avgCost) || avgCost <= 0) {
      setError('Average cost must be a positive number');
      return false;
    }

    if (!editingPosition) {
      const totalCost = shares * avgCost;
      if (totalCost > cashBalance) {
        setError(`Insufficient cash. Need ${formatCurrency(totalCost)} but only have ${formatCurrency(cashBalance)}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateForm()) return;

    setIsSubmitting(true);

    const ticker = formData.ticker.toUpperCase();
    const shares = parseFloat(formData.shares);
    const avgCost = parseFloat(formData.avgCost);

    let result: { error: string | null };
    if (editingPosition) {
      result = await onUpdatePosition(editingPosition.id, { shares, averageCost: avgCost });
    } else {
      result = await onAddPosition(ticker, shares, avgCost);
    }

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFormData({ ticker: '', shares: '', avgCost: '' });
    setIsAddModalOpen(false);
    setEditingPosition(null);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      ticker: position.ticker,
      shares: position.shares.toString(),
      avgCost: position.averageCost.toString(),
    });
    setError('');
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await onRemovePosition(id);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
    }
  };

  const openAddModal = () => {
    setFormData({ ticker: '', shares: '', avgCost: '' });
    setError('');
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingPosition(null);
    setFormData({ ticker: '', shares: '', avgCost: '' });
    setError('');
  };

  const gainBgClass = totalGain >= 0 ? 'bg-gain/20' : 'bg-loss/20';
  const gainTextClass = totalGain >= 0 ? 'text-gain' : 'text-loss';
  const dayBgClass = dayChange >= 0 ? 'bg-gain/20' : 'bg-loss/20';
  const dayTextClass = dayChange >= 0 ? 'text-gain' : 'text-loss';

  return (
    <div className="space-y-6">
      {error && !isAddModalOpen && !editingPosition && (
        <div className="p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-loss hover:text-loss-light">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-sm text-slate-400">Positions</p>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
        </div>

        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gain/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gain" />
            </div>
          </div>
          <p className="text-sm text-slate-400">Total Value</p>
          <p className="text-2xl font-bold text-white">{formatCompactCurrency(totalValue)}</p>
        </div>

        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg ${gainBgClass} flex items-center justify-center`}>
              <TrendingUp className={`w-5 h-5 ${gainTextClass}`} />
            </div>
          </div>
          <p className="text-sm text-slate-400">Total Gain</p>
          <p className={`text-2xl font-bold ${totalGain >= 0 ? 'gain-text' : 'loss-text'}`}>
            {formatCompactCurrency(totalGain)}
          </p>
        </div>

        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg ${dayBgClass} flex items-center justify-center`}>
              <Percent className={`w-5 h-5 ${dayTextClass}`} />
            </div>
          </div>
          <p className="text-sm text-slate-400">Day Change</p>
          <p className={`text-2xl font-bold ${dayChange >= 0 ? 'gain-text' : 'loss-text'}`}>
            {dayChange >= 0 ? '+' : ''}{formatCompactCurrency(dayChange)}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Manage Positions</h3>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
            <Plus className="w-4 h-4" />
            Add Position
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">No positions in your portfolio</p>
            <p className="text-sm text-slate-500 mb-6">Add your first position to start tracking</p>
            <button onClick={openAddModal} className="btn-primary">
              Add Position
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map(position => (
              <div
                key={position.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <span className="font-mono font-semibold text-accent">
                      {position.ticker}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{position.shares.toLocaleString()} shares</span>
                      <span className="text-slate-500">@</span>
                      <span className="text-slate-400">{formatCurrency(position.averageCost)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400">Current: {formatCurrency(position.currentPrice)}</span>
                      <span className={`font-medium ${position.totalGain >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {position.totalGain >= 0 ? '+' : ''}{formatCurrency(position.totalGain)}
                        {' '}({position.totalGainPercent >= 0 ? '+' : ''}{position.totalGainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(position)}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
                    disabled={isSubmitting || deletingId === position.id}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(position.id)}
                    className="btn-danger disabled:opacity-50 flex items-center gap-2"
                    disabled={isSubmitting || deletingId === position.id}
                  >
                    {deletingId === position.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Selling...
                      </>
                    ) : (
                      'Sell'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(isAddModalOpen || editingPosition) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingPosition ? 'Edit Position' : 'Add Position'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200 transition-colors" disabled={isSubmitting}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingPosition && (
                <div>
                  <label className="input-label">Ticker Symbol</label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={e => { setFormData({ ...formData, ticker: e.target.value.toUpperCase() }); setError(''); }}
                    className="input-field uppercase text-center font-mono"
                    placeholder="NVDA"
                    maxLength={5}
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div>
                <label className="input-label">Number of Shares</label>
                <input
                  type="number"
                  value={formData.shares}
                  onChange={e => { setFormData({ ...formData, shares: e.target.value }); setError(''); }}
                  className="input-field"
                  placeholder="100"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="input-label">Average Cost per Share</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={formData.avgCost}
                    onChange={e => { setFormData({ ...formData, avgCost: e.target.value }); setError(''); }}
                    className="input-field pl-10"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {!editingPosition && formData.shares && formData.avgCost && (
                <div className="p-3 bg-accent/10 rounded-xl">
                  <p className="text-sm text-slate-400">
                    Total Cost: <span className="text-white font-semibold">
                      {formatCurrency((parseFloat(formData.shares) || 0) * (parseFloat(formData.avgCost) || 0))}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Available: {formatCurrency(cashBalance)}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-loss/10 border border-loss/30 rounded-xl text-loss text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {editingPosition ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingPosition ? 'Update Position' : 'Add Position'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
