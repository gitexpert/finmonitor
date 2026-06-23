import { Outlet } from 'react-router-dom';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';

export default function Layout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
        <footer className="border-t border-slate-800/50 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-slate-500">
              Alpha-1 Portfolio Monitor - Not financial advice. Data is simulated for demonstration purposes.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
