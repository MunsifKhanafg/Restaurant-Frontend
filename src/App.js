import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { useSocket } from './hooks/useSocket';
import { ModalProvider } from './components/common/AppModal';
import { RestaurantProvider } from './hooks/useRestaurant';

// Layouts
import MainLayout from './components/common/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import POSPage from './pages/POSPage';
import OrdersPage from './pages/OrdersPage';
import KitchenPage from './pages/KitchenPage';
import InventoryPage from './pages/InventoryPage';
import DeliveryPage from './pages/DeliveryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';

// ─────────────────────────────────────────────
// PrivateRoute — two jobs:
//   1. Redirect unauthenticated users to /login
//   2. If `roles` is provided, redirect users whose role is NOT in that list
//      • admin/manager mis-route → /pos (shouldn't happen, but safe fallback)
//      • all others mis-route    → /pos  (their workspace)
// ─────────────────────────────────────────────
const PrivateRoute = ({ children, roles }) => {
  const { user, token } = useSelector((s) => s.auth);

  // Not logged in → login page
  if (!token || !user) return <Navigate to="/login" replace />;

  // Logged in but wrong role → bounce to their workspace
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

// ─────────────────────────────────────────────
// RoleHome — what happens when someone hits "/"
//   • admin / manager → Dashboard (full access)
//   • everyone else   → POS (their only workspace)
// ─────────────────────────────────────────────
const RoleHome = () => {
  const { user, token } = useSelector((s) => s.auth);
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'manager') return <DashboardPage />;
  return <Navigate to="/pos" replace />;
};

function AppContent() {
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  useSocket(user?.role);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            border: '1px solid rgba(212,175,55,0.2)',
            fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
          },
          success: { iconTheme: { primary: '#D4AF37', secondary: '#0D0D0D' } },
          error:   { iconTheme: { primary: '#E05252', secondary: '#0D0D0D' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected shell */}
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>

          {/* "/" → smart redirect based on role */}
          <Route index element={<RoleHome />} />

          {/* Admin + Manager only */}
          <Route path="menu"      element={<PrivateRoute roles={['admin','manager']}><MenuPage /></PrivateRoute>} />
          <Route path="inventory" element={<PrivateRoute roles={['admin','manager']}><InventoryPage /></PrivateRoute>} />
          <Route path="analytics" element={<PrivateRoute roles={['admin','manager']}><AnalyticsPage /></PrivateRoute>} />
          <Route path="staff"     element={<PrivateRoute roles={['admin','manager']}><StaffPage /></PrivateRoute>} />

          {/* Admin only */}
          <Route path="settings"  element={<PrivateRoute roles={['admin']}><SettingsPage /></PrivateRoute>} />

          {/* Admin + Manager + Waiter */}
          <Route path="pos"    element={<PrivateRoute roles={['admin','manager','waiter']}><POSPage /></PrivateRoute>} />
          <Route path="orders" element={<PrivateRoute roles={['admin','manager','waiter']}><OrdersPage /></PrivateRoute>} />

          {/* Admin + Manager + Chef */}
          <Route path="kitchen" element={<PrivateRoute roles={['admin','manager','chef']}><KitchenPage /></PrivateRoute>} />

          {/* Admin + Manager + Driver */}
          <Route path="delivery" element={<PrivateRoute roles={['admin','manager','driver']}><DeliveryPage /></PrivateRoute>} />
        </Route>

        {/* Anything unknown → smart home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <RestaurantProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </RestaurantProvider>
    </Router>
  );
}

export default App;
