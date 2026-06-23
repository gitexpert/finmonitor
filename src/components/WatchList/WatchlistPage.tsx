import { usePortfolio } from '../../contexts/PortfolioContext';
import WatchlistPanel from '../WatchList/WatchlistPanel';

export default function WatchlistPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = usePortfolio();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <p className="text-slate-400 mt-1">Track potential opportunities</p>
      </div>

      <WatchlistPanel
        watchlist={watchlist}
        onAdd={addToWatchlist}
        onRemove={removeFromWatchlist}
        showAdd={true}
      />
    </div>
  );
}
