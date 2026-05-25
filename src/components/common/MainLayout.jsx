import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AppToast from './AppToast';

export default function MainLayout() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', transition: 'background-color 0.3s ease', position: 'relative' }}>
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isMobile ? '0px' : (sidebarOpen ? '256px' : '76px'),
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          minWidth: 0,
        }}
      >
        <TopBar isMobile={isMobile} onMenuToggle={() => setMobileMenuOpen(v => !v)} />
        <main style={{ flex: 1, padding: isMobile ? '10px 10px 80px' : '24px', overflowY: 'auto', overflowX: 'hidden', maxWidth: '100vw', WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
