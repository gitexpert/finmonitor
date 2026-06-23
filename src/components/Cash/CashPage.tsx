import { usePortfolio } from '../../contexts/PortfolioContext';
import CashManagement from './CashManagement';
import TransactionLedger from './TransactionLedger';
import AllocationMatrix from '../Dashboard/AllocationMatrix';
import { useState } from 'react';
import { Wallet, History, PieChart } from 'lucide-react';

type Tab = 'overview' | 'transactions' | 'allocation';

export default function CashPage() {
  const { cash, updateCashBalance, positions, transactions } = usePortfolio();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'allocation', label: 'Allocation', icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cash & Analytics</h1>
        <p className="text-slate-400 mt-1">Manage reserves, review transactions, and analyze allocations</p>
      </div>

      <div className="flex border-b border-slate-800/50">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <CashManagement
          cash={cash}
          onDeposit={amount => updateCashBalance(amount, 'Deposit')}
          onWithdraw={amount => updateCashBalance(-amount, 'Withdrawal')}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionLedger
          transactions={transactions}
          cashBalance={cash.balance}
        />
      )}

      {activeTab === 'allocation' && (
        <AllocationMatrix positions={positions} cashBalance={cash.balance} />
      )}
    </div>
  );
}
