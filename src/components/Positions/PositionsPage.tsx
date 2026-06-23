import { usePortfolio } from '../../contexts/PortfolioContext';
import PositionManager from './PositionManager';

export default function PositionsPage() {
  const { positions, cash, addPosition, updatePosition, removePosition } = usePortfolio();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Position Manager</h1>
        <p className="text-slate-400 mt-1">Add, edit, or remove portfolio positions</p>
      </div>

      <PositionManager
        positions={positions}
        cashBalance={cash.balance}
        onAddPosition={addPosition}
        onUpdatePosition={updatePosition}
        onRemovePosition={removePosition}
      />
    </div>
  );
}
