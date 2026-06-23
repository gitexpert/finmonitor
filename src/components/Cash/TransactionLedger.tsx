import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, RefreshCw } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatCurrency, timeAgo } from '../../utils/mockData';

interface TransactionLedgerProps {
  transactions: Transaction[];
  cashBalance: number;
  isLoading?: boolean;
}

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'buy':
      return ArrowDownRight;
    case 'sell':
      return ArrowUpRight;
    default:
      return DollarSign;
  }
};

const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'buy':
      return { bg: 'bg-loss/10', icon: 'text-loss', text: 'text-loss' };
    case 'sell':
      return { bg: 'bg-gain/10', icon: 'text-gain', text: 'text-gain' };
    default:
      return { bg: 'bg-slate-800/50', icon: 'text-slate-400', text: 'text-slate-300' };
  }
};

export default function TransactionLedger({ transactions, cashBalance, isLoading }: TransactionLedgerProps) {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;

    if (timeRange !== 'all') {
      const txDate = new Date(t.timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

      if (timeRange === 'week' && diffDays > 7) return false;
      if (timeRange === 'month' && diffDays > 30) return false;
      if (timeRange === 'year' && diffDays > 365) return false;
    }

    return true;
  });

  // Calculate running balance
  let runningBalance = cashBalance;
  const transactionsWithBalance = filteredTransactions.map(tx => {
    const amount = tx.type === 'sell' ? tx.total : -tx.total;
    const balance = runningBalance;
    runningBalance -= amount;
    return { ...tx, runningBalance: balance };
  }).reverse();

  const totalBuyVolume = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.total, 0);

  const totalSellVolume = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.total, 0);

  const netCashFlow = totalSellVolume - totalBuyVolume;

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Transaction Ledger</h3>
            <p className="text-sm text-slate-400">Complete trade history with running balance</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as 'all' | 'buy' | 'sell')}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm"
            >
              <option value="all">All Types</option>
              <option value="buy">Buys Only</option>
              <option value="sell">Sells Only</option>
            </select>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as 'all' | 'week' | 'month' | 'year')}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-slate-800/50">
        <div className="bg-slate-900 px-6 py-4">
          <p className="text-sm text-slate-400">Total Buys</p>
          <p className="text-xl font-semibold text-loss">{formatCurrency(totalBuyVolume)}</p>
        </div>
        <div className="bg-slate-900 px-6 py-4">
          <p className="text-sm text-slate-400">Total Sells</p>
          <p className="text-xl font-semibold text-gain">{formatCurrency(totalSellVolume)}</p>
        </div>
        <div className="bg-slate-900 px-6 py-4">
          <p className="text-sm text-slate-400">Net Cash Flow</p>
          <p className={`text-xl font-semibold ${netCashFlow >= 0 ? 'text-gain' : 'text-loss'}`}>
            {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
          </p>
        </div>
      </div>

      {transactionsWithBalance.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-400">No transactions yet</p>
          <p className="text-sm text-slate-500 mt-1">Your trade history will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Shares</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {transactionsWithBalance.map((tx) => {
                const Icon = getTransactionIcon(tx.type);
                const colors = getTransactionColor(tx.type);

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {new Date(tx.timestamp).toLocaleDateString()}
                      <span className="text-xs ml-1 text-slate-500">
                        {timeAgo(tx.timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                        <span className={`text-sm font-medium capitalize ${colors.text}`}>{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-white">{tx.ticker}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                      {tx.shares.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                      {formatCurrency(tx.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-semibold ${colors.text}`}>
                        {tx.type === 'sell' ? '+' : '-'}{formatCurrency(tx.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                      {formatCurrency(tx.runningBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
