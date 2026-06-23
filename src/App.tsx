import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import LoginPage from './components/Auth/LoginPage';
import SignupPage from './components/Auth/SignupPage';
import Layout from './components/common/Layout';
import DashboardPage from './components/Dashboard/DashboardPage';
import PositionsPage from './components/Positions/PositionsPage';
import WatchlistPage from './components/WatchList/WatchlistPage';
import CashPage from './components/Cash/CashPage';
import NetworkManagerPage from './components/Network/NetworkManagerPage';
import NotificationSettingsPage from './components/Settings/NotificationSettingsPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*" element={<Layout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="positions" element={<PositionsPage />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="cash" element={<CashPage />} />
        <Route path="network" element={<NetworkManagerPage />} />
        <Route path="settings/notifications" element={<NotificationSettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortfolioProvider>
          <AppRoutes />
        </PortfolioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
