import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AppToast from './AppToast';

export default function MainLayout() {
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', transition: 'background-color 0.3s ease' }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: sidebarOpen ? '256px' : '76px',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
        }}
      >
        <TopBar />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
