import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import type { Position } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/mockData';

interface PositionsTableProps {
  positions: Position[];
  onEdit?: (position: Position) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export default function PositionsTable({
  positions,
  onEdit,
  onDelete,
  showActions = false,
}: PositionsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);

  if (positions.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Positions</h3>
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">No positions yet</p>
          <p className="text-sm text-slate-500">Add your first position to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/50">
        <h3 className="text-lg font-semibold text-white">Positions</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Shares
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Avg Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Day Change
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Gain
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Allocation
              </th>
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {positions.map(position => {
              const allocation = (position.totalValue / totalValue) * 100;
              const totalGain = position.totalGain;

              return (
                <tr key={position.id} className="table-row-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-mono text-xs font-semibold">
                        {position.ticker.slice(0, 2)}
                      </div>
                      <span className="font-medium text-white">{position.ticker}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                    {position.shares.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                    {formatCurrency(position.averageCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                    {formatCurrency(position.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`flex items-center justify-end gap-1 ${
                      position.dayChangePercent >= 0 ? 'text-gain' : 'text-loss'
                    }`}>
                      {position.dayChangePercent >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {formatPercent(position.dayChangePercent)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`${totalGain >= 0 ? 'text-gain' : 'text-loss'}`}>
                      <div className="font-medium">{formatCurrency(totalGain)}</div>
                      <div className="text-xs">
                        {formatPercent(position.totalGainPercent)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(allocation, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-400 w-12">
                        {allocation.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === position.id ? null : position.id)}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === position.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-6 top-full mt-1 z-50 dropdown-menu">
                            <button
                              onClick={() => {
                                onEdit?.(position);
                                setOpenMenuId(null);
                              }}
                              className="dropdown-item flex items-center gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                onDelete?.(position.id);
                                setOpenMenuId(null);
                              }}
                              className="dropdown-item flex items-center gap-2 text-loss"
                            >
                              <Trash2 className="w-4 h-4" />
                              Sell All
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
