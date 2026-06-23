import { usePortfolio } from '../../contexts/PortfolioContext';
import CashManagement from './CashManagement';

export default function CashPage() {
  const { cash, updateCashBalance } = usePortfolio();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cash Management</h1>
        <p className="text-slate-400 mt-1">Track your dry powder reserves</p>
      </div>

      <CashManagement
        cash={cash}
        onDeposit={amount => updateCashBalance(amount, 'Deposit')}
        onWithdraw={amount => updateCashBalance(-amount, 'Withdrawal')}
      />
    </div>
  );
}
