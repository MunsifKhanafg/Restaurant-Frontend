import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { toggleTheme, clearNotifications } from '../../store/slices/uiSlice';
import { formatCurrency } from '../../utils/helpers';

const PAGE_TITLES = {
  '/': 'Dashboard', '/pos': 'Point of Sale', '/kitchen': 'Kitchen Display',
  '/orders': 'Orders', '/delivery': 'Delivery', '/menu': 'Menu Management',
  '/inventory': 'Inventory', '/analytics': 'Analytics', '/staff': 'Staff & HR', '/settings': 'Settings',
};

const PAYMENT_ICONS = {
  cash: '💵', card: '💳', jazzcash: '📱', easypaisa: '💚', bankaccount: '🏦', cod: '📦', online: '🌐',
};

export default function TopBar({ isMobile = false, onMenuToggle = () => {} }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const notifications = useSelector((s) => s.ui.notifications);
  const pendingOrders = useSelector((s) => s.orders.kitchenOrders.length);
  const theme = useSelector((s) => s.ui.theme);
  const title = PAGE_TITLES[location.pathname] || 'Restaurant';
  const [showNotifs, setShowNotifs] = useState(false);

  // Count unread order notifications
  const newOrderCount = notifications.filter(n => n.type === 'order').length;

  return (
    <header style={{
      height: '64px', background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 24px', position: 'sticky', top: 0, zIndex: 50,
      transition: 'background-color 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger on mobile */}
        {isMobile && (
          <button onClick={onMenuToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--text-primary)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            ☰
          </button>
        )}
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: isMobile ? '18px' : '22px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {!isMobile && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Kitchen badge */}
        {pendingOrders > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px' }}>🍳</span>
            <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: '600' }}>{pendingOrders} in kitchen</span>
          </div>
        )}

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={() => dispatch(toggleTheme())}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* 🔔 Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: showNotifs ? 'rgba(212,175,55,0.15)' : 'var(--bg-elevated)',
              border: `1px solid ${showNotifs ? 'var(--border-strong)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '18px', position: 'relative', transition: 'all 0.2s',
            }}
          >
            🔔
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: newOrderCount > 0 ? '#D4AF37' : 'var(--red)',
                color: newOrderCount > 0 ? '#0D0D0D' : '#fff',
                fontSize: '9px', fontWeight: '700', borderRadius: '999px',
                padding: '1px 5px', minWidth: '16px', textAlign: 'center', lineHeight: '16px',
              }}>
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowNotifs(false)} />
              <div style={{
                position: 'absolute', top: '48px', right: 0,
                width: '380px', maxHeight: '480px',
                background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
                borderRadius: '14px', boxShadow: '0 16px 56px rgba(0,0,0,0.65)',
                overflow: 'hidden', zIndex: 200,
              }}>
                {/* Header */}
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(212,175,55,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔔</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Live Notifications</span>
                    {notifications.length > 0 && (
                      <span style={{ fontSize: '10px', background: 'var(--red)', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontWeight: '700' }}>
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { dispatch(clearNotifications()); setShowNotifs(false); }}
                      style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 10px', borderRadius: '6px' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔕</div>
                      <div style={{ fontSize: '13px' }}>No notifications yet</div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>New orders will appear here instantly</div>
                    </div>
                  ) : notifications.map((n, idx) => (
                    <div key={n.id} style={{
                      padding: '13px 18px',
                      borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      background: idx === 0 ? 'rgba(212,175,55,0.05)' : 'transparent',
                      transition: 'background 0.2s',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        background: n.type === 'order'
                          ? 'rgba(212,175,55,0.15)'
                          : n.type === 'status'
                          ? 'rgba(74,158,202,0.15)'
                          : 'rgba(224,82,82,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                      }}>
                        {n.type === 'order' ? '🍽️' : n.type === 'status' ? '🔄' : '⚠️'}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: n.type === 'order' ? '600' : '500', lineHeight: 1.4 }}>
                          {n.message}
                        </div>

                        {/* Rich order detail for new orders */}
                        {n.type === 'order' && n.billId && (
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {n.orderType && (
                              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.2)', fontWeight: '600', textTransform: 'capitalize' }}>
                                {n.orderType === 'dine-in' ? `🪑 Table ${n.tableNumber}` : n.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}
                              </span>
                            )}
                            {n.itemCount > 0 && (
                              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                {n.itemCount} item{n.itemCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {n.totalAmount > 0 && (
                              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'var(--bg-elevated)', color: 'var(--gold)', border: '1px solid var(--border)', fontWeight: '700' }}>
                                {formatCurrency(n.totalAmount)}
                              </span>
                            )}
                            {n.paymentMethod && (
                              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                {PAYMENT_ICONS[n.paymentMethod] || '💳'} {n.paymentMethod}
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(n.id).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Badge */}
                      {n.type === 'order' && (
                        <span style={{
                          fontSize: '10px', background: 'rgba(212,175,55,0.15)', color: 'var(--gold)',
                          padding: '2px 8px', borderRadius: '999px', fontWeight: '700',
                          whiteSpace: 'nowrap', alignSelf: 'center', border: '1px solid rgba(212,175,55,0.3)',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
