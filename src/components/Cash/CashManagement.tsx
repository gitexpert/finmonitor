import { useState } from 'react';
import { DollarSign, Plus, Minus, Wallet, ArrowDownToLine, ArrowUpFromLine, Lock, Edit3 } from 'lucide-react';
import type { CashReserve } from '../../types';
import { formatCurrency } from '../../utils/mockData';

interface CashManagementProps {
  cash: CashReserve;
  onDeposit?: (amount: number) => void;
  onWithdraw?: (amount: number) => void;
}

export default function CashManagement({ cash, onDeposit, onWithdraw }: CashManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleTransaction = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (transactionType === 'withdraw' && numAmount > cash.balance) {
      setError('Insufficient balance');
      return;
    }

    setError('');

    if (transactionType === 'deposit') {
      onDeposit?.(numAmount);
    } else {
      onWithdraw?.(numAmount);
    }

    setAmount('');
    setIsModalOpen(false);
  };

  const openModal = (type: 'deposit' | 'withdraw') => {
    setTransactionType(type);
    setAmount('');
    setError('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gain/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-gain" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{cash.name}</h3>
              <p className="text-sm text-slate-400">Available for new positions</p>
            </div>
          </div>
          <Edit3 className="w-5 h-5 text-slate-500" />
        </div>

        <div className="mb-6">
          <div className="text-4xl font-bold text-white mb-2">
            {formatCurrency(cash.balance)}
          </div>
          <p className="text-sm text-slate-500">
            Last updated: {timeAgo(new Date(cash.lastUpdated), new Date())}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => openModal('deposit')}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gain/20 text-gain hover:bg-gain/30 transition-colors font-medium"
          >
            <ArrowDownToLine className="w-5 h-5" />
            <span className="hidden sm:inline">Add Funds</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button
            onClick={() => openModal('withdraw')}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
          >
            <ArrowUpFromLine className="w-5 h-5" />
            <span className="hidden sm:inline">Withdraw</span>
            <span className="sm:hidden">Take</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-ai/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-ai" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Dry Powder Ratio</p>
              <p className="text-xl font-bold text-white">
                {cash.balance > 0 ? 'Active' : 'Depleted'}
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {cash.balance > 10000
              ? 'Healthy cash reserves ready for opportunities'
              : cash.balance > 0
                ? 'Consider building cash reserves'
                : 'Cash reserves depleted - consider rebalancing'}
          </div>
        </div>

        <div className="metric-card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Buying Power</p>
              <p className="text-xl font-bold text-white">{formatCurrency(cash.balance)}</p>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Available for immediate deployment into new positions
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass-card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {transactionType === 'deposit' ? 'Add Funds' : 'Withdraw Funds'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field pl-10"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
              </div>

              {transactionType === 'withdraw' && (
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-400">
                    Available balance: <span className="text-white font-semibold">{formatCurrency(cash.balance)}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-loss/10 border border-loss/30 rounded-xl text-loss text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map(quickAmount => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
                  >
                    {quickAmount >= 1000 ? `${quickAmount / 1000}K` : `$${quickAmount}`}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTransaction}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  transactionType === 'deposit'
                    ? 'bg-gain text-white hover:bg-gain-dark'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {transactionType === 'deposit' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Funds
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Minus className="w-5 h-5" />
                    Withdraw Funds
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
