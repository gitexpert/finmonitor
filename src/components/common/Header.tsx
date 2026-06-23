import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  LayoutDashboard,
  Briefcase,
  DollarSign,
  Eye,
  Users,
  Bell,
  History as HistoryIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/positions', label: 'Positions', icon: Briefcase },
  { path: '/cash', label: 'Cash', icon: DollarSign },
  { path: '/watchlist', label: 'Watchlist', icon: Eye },
  { path: '/network', label: 'Network', icon: Users },
];

export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <span className="text-lg font-semibold text-white hidden sm:block">Alpha-1</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-accent/20 text-accent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-300">
                  {user?.name || 'User'}
                </span>
              </button>

              {isProfileOpen && (
                <div className="dropdown-menu">
                  <Link to="/network" className="dropdown-item flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                    <Users className="w-4 h-4" />
                    Network Manager
                  </Link>
                  <Link to="/settings/notifications" className="dropdown-item flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                    <Bell className="w-4 h-4" />
                    Notification Settings
                  </Link>
                  <button className="dropdown-item flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button className="dropdown-item flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4" />
                    Transaction History
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button
                    onClick={handleLogout}
                    className="dropdown-item flex items-center gap-2 text-loss hover:text-loss-light"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-800/50 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <nav className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/20 text-accent'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
