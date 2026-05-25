import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useRestaurant } from '../../hooks/useRestaurant';

const NAV_ITEMS = [
  // Dashboard is only visible to admin & manager — all others land on /pos
  { path: '/',          label: 'Dashboard',   icon: '🏠', roles: ['admin','manager'] },
  { path: '/pos',       label: 'POS / Order', icon: '🧾', roles: ['admin','manager','waiter'] },
  { path: '/kitchen',   label: 'Kitchen KDS', icon: '👨‍🍳', roles: ['admin','manager','chef'] },
  { path: '/orders',    label: 'Orders',      icon: '📋', roles: ['admin','manager','waiter'] },
  { path: '/delivery',  label: 'Delivery',    icon: '🛵', roles: ['admin','manager','driver'] },
  { path: '/menu',      label: 'Menu',        icon: '🍽️', roles: ['admin','manager'] },
  { path: '/inventory', label: 'Inventory',   icon: '📦', roles: ['admin','manager'] },
  { path: '/analytics', label: 'Analytics',   icon: '📊', roles: ['admin','manager'] },
  { path: '/staff',     label: 'Staff & HR',  icon: '👥', roles: ['admin','manager'] },
  { path: '/settings',  label: 'Settings',    icon: '⚙️', roles: ['admin'] },
];

export default function Sidebar({ isMobile = false, mobileMenuOpen = false, onMobileClose = () => {} }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const user = useSelector((s) => s.auth.user);
  const stockAlerts = useSelector((s) => s.products.stockAlerts);
  const { name: restaurantName } = useRestaurant();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNavClick = () => {
    if (isMobile) onMobileClose();
  };

  // On mobile, sidebar slides in/out as a full-width drawer
  if (isMobile) {
    return (
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        width: '260px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.3s ease',
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '72px' }}>
          <div style={{ flexShrink: 0, width: '42px', height: '42px' }}>
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="21" cy="21" r="20" stroke="#D4AF37" strokeWidth="1.2" fill="none" opacity="0.6"/>
              <circle cx="21" cy="21" r="16" stroke="#D4AF37" strokeWidth="0.6" fill="none" opacity="0.35"/>
              <circle cx="21" cy="21" r="18" fill="url(#logoGradM)"/>
              <path d="M16 9 L16 17 Q16 19 17.5 19.5 L17.5 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M14 9 L14 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M16 9 L16 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M18 9 L18 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M26 9 L26 16 Q30 18 30 21 L26 22 L26 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <defs><radialGradient id="logoGradM" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#E8C84A"/><stop offset="100%" stopColor="#A07808"/></radialGradient></defs>
            </svg>
          </div>
            <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '18px', fontWeight: '700',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.1,
              backgroundImage: 'linear-gradient(135deg, #E8C84A, #D4AF37, #B8960C)',
            }}>{restaurantName}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '2px' }}>Management Suite</div>
          </div>
          <button onClick={onMobileClose} style={{ background: 'none', border: 'none', color: 'var(--sidebar-text)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>✕</button>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {visibleItems.map(({ path, label, icon }) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', position: 'relative' }} onClick={handleNavClick}>
              <span className="nav-icon" style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
              {path === '/inventory' && stockAlerts.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '999px', padding: '1px 6px' }}>{stockAlerts.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        {/* User + Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #D4AF37, #B8960C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D0D0D', fontWeight: '700', fontSize: '14px' }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 'none', cursor: 'pointer', justifyContent: 'flex-start' }}>
            <span className="nav-icon" style={{ fontSize: '22px' }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      width: sidebarOpen ? '256px' : '76px',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: sidebarOpen ? '20px 20px 16px' : '20px 16px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex', alignItems: 'center', gap: '12px',
        minHeight: '72px', overflow: 'hidden',
      }}>
        {/* SVG Logo Mark */}
        <div style={{ flexShrink: 0, width: '42px', height: '42px', position: 'relative' }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="21" cy="21" r="20" stroke="#D4AF37" strokeWidth="1.2" fill="none" opacity="0.6"/>
            <circle cx="21" cy="21" r="16" stroke="#D4AF37" strokeWidth="0.6" fill="none" opacity="0.35"/>
            <circle cx="21" cy="21" r="18" fill="url(#logoGrad)"/>
            <path d="M16 9 L16 17 Q16 19 17.5 19.5 L17.5 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M14 9 L14 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M16 9 L16 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M18 9 L18 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M26 9 L26 16 Q30 18 30 21 L26 22 L26 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M13 21 Q21 23.5 29 21" stroke="#0D0D0D" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5"/>
            <defs>
              <radialGradient id="logoGrad" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#E8C84A"/>
                <stop offset="100%" stopColor="#A07808"/>
              </radialGradient>
            </defs>
          </svg>
        </div>
        {sidebarOpen && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '19px', fontWeight: '700',
              backgroundImage: 'linear-gradient(135deg, #E8C84A 0%, #D4AF37 50%, #B8960C 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.1, letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}>{restaurantName}</div>
            <div style={{
              fontSize: '9px', color: 'var(--text-muted)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              marginTop: '2px', fontWeight: '500',
              whiteSpace: 'nowrap',
            }}>— Management Suite —</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', position: 'relative' }}
            title={!sidebarOpen ? label : ''}
          >
            <span className="nav-icon" style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
            {sidebarOpen && <span>{label}</span>}
            {path === '/inventory' && stockAlerts.length > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--red)', color: '#fff',
                fontSize: '10px', fontWeight: '700', borderRadius: '999px',
                padding: '1px 6px', minWidth: '18px', textAlign: 'center',
              }}>{stockAlerts.length}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
        {sidebarOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0D0D0D', fontWeight: '700', fontSize: '14px',
            }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>{user?.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', cursor: 'pointer', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
        >
          <span className="nav-icon" style={{ fontSize: '22px' }}>🚪</span>
          {sidebarOpen && <span>Logout</span>}
        </button>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', cursor: 'pointer', marginTop: '2px', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
        >
          <span className="nav-icon" style={{ fontSize: '22px' }}>{sidebarOpen ? '◀' : '▶'}</span>
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
