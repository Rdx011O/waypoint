// WAYPOINT — Maritime Route Intelligence | Main Application Component
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import PlanShipment from './pages/PlanShipment';
import CompareRoutes from './pages/CompareRoutes';
import SavedRoutes from './pages/SavedRoutes';
import LiveRiskMap from './pages/LiveRiskMap';
import ReroutingCenter from './pages/ReroutingCenter';
import AlertsCenter from './pages/AlertsCenter';
import Analytics from './pages/Analytics';
import RouteAssistant from './pages/RouteAssistant';
import Settings from './pages/Settings';
import TradeCatalog from './pages/TradeCatalog';
import CargoTracking from './pages/CargoTracking';
import MyBookings from './pages/MyBookings';
import BookedSlotsQueue from './pages/BookedSlotsQueue';
import './index.css';

function AppContent() {
  const { isLoggedIn, currentRole, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // When role changes, ensure current page is valid for that role
  useEffect(() => {
    if (currentRole === 'shipper') {
      const shipperPages = ['dashboard', 'mybookings', 'tracking', 'plan', 'compare', 'catalog', 'saved', 'assistant', 'settings'];
      if (!shipperPages.includes(currentPage)) {
        setCurrentPage('dashboard');
      }
    } else if (currentRole === 'manager') {
      const managerPages = ['dashboard', 'queue', 'tracking', 'riskmap', 'catalog', 'rerouting', 'alerts', 'analytics', 'assistant', 'settings'];
      if (!managerPages.includes(currentPage)) {
        setCurrentPage('dashboard');
      }
    }
  }, [currentRole, currentPage]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--accent-cyan)',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: 600
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="waypoint-brand" style={{ fontSize: '26px', marginBottom: '12px' }}>
            WAYPOINT<span className="brand-dot">.</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Synchronizing Maritime Intelligence Session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated view: Sign In & Sign Up
  if (!isLoggedIn) {
    return <AuthPage />;
  }

  const navigateTo = (pageId) => {
    setCurrentPage(pageId);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'mybookings':
        return <MyBookings onNavigate={navigateTo} />;
      case 'queue':
        return <BookedSlotsQueue onNavigate={navigateTo} />;
      case 'tracking':
        return <CargoTracking onNavigate={navigateTo} />;
      case 'plan':
        return <PlanShipment onNavigate={navigateTo} />;
      case 'compare':
        return <CompareRoutes onNavigate={navigateTo} />;
      case 'catalog':
        return <TradeCatalog onNavigate={navigateTo} />;
      case 'saved':
        return <SavedRoutes onNavigate={navigateTo} />;
      case 'riskmap':
        return <LiveRiskMap onNavigate={navigateTo} />;
      case 'rerouting':
        return <ReroutingCenter onNavigate={navigateTo} />;
      case 'alerts':
        return <AlertsCenter onNavigate={navigateTo} />;
      case 'analytics':
        return <Analytics />;
      case 'assistant':
        return <RouteAssistant onNavigate={navigateTo} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: 'var(--sidebar-w)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.25s ease'
      }} className="main-content-wrapper">
        <Topbar
          currentPage={currentPage}
          onNavigate={navigateTo}
          onToggleMobile={() => setMobileSidebarOpen(prev => !prev)}
          alertCount={5}
        />

        <main style={{
          flex: 1,
          padding: '24px 28px',
          overflowY: 'auto'
        }}>
          {renderActivePage()}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-content-wrapper {
            margin-left: 0 !important;
          }
          main {
            padding: 16px 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
