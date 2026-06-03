import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/slices/productSlice';
import { createOrder, fetchOrders } from '../store/slices/orderSlice';
import {
  addItem, removeItem, updateQuantity,
  setTableNumber, setOrderType, setDiscount, clearCart,
  selectCartSubtotal, selectCartTax, selectCartTotal, selectCartCount,
} from '../store/slices/cartSlice';
import { formatCurrency, formatDateTime, printBill } from '../utils/helpers';
import { useRestaurant } from '../hooks/useRestaurant';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────── */
const CATEGORIES = [
  'All','Starters','Main Course','Grill & BBQ','Seafood',
  'Pasta & Rice','Pizza','Burgers','Salads','Soups',
  'Desserts','Beverages','Specials',
];
const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);
const BREAD_CATEGORIES = ['Main Course', 'Grill & BBQ', 'Seafood', 'Starters'];
const DELIVERY_CHARGE = 150;

const PAYMENT_METHODS = [
  { value: 'cash',        label: '💵 Cash' },
  { value: 'card',        label: '💳 Card' },
  { value: 'jazzcash',    label: '📱 JazzCash' },
  { value: 'easypaisa',   label: '💚 Easypaisa' },
  { value: 'bankaccount', label: '🏦 Bank Account' },
  { value: 'cod',         label: '📦 COD' },
];

const CATEGORY_IMAGES = {
  'Starters':    'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=300&q=80',
  'Main Course': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80',
  'Grill & BBQ': 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=300&q=80',
  'Seafood':     'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=300&q=80',
  'Pasta & Rice':'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=300&q=80',
  'Pizza':       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80',
  'Burgers':     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80',
  'Salads':      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80',
  'Soups':       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=80',
  'Desserts':    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&q=80',
  'Beverages':   'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&q=80',
  'Specials':    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&q=80',
  'default':     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&q=80',
};

/* ─────────────────────────────────────────────────
   TINY INLINE MODAL
───────────────────────────────────────────────── */
function AppModal({ modal, onClose }) {
  if (!modal) return null;
  const iconMap  = { error: '❌', success: '✅', confirm: '⚠️', warning: '⚠️' };
  const colorMap = { error: '#ef4444', success: 'var(--green)', warning: 'var(--gold)', confirm: 'var(--gold)' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '380px', padding: '30px', textAlign: 'center' }}>
        <div style={{ fontSize: '42px', marginBottom: '12px' }}>{iconMap[modal.type] || 'ℹ️'}</div>
        <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '21px',
                     color: colorMap[modal.type] || 'var(--gold)', marginBottom: '10px' }}>
          {modal.title}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '22px' }}>
          {modal.message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {modal.onConfirm && (
            <button className="btn-outline-gold" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              Cancel
            </button>
          )}
          <button
            onClick={() => { modal.onConfirm ? modal.onConfirm() : onClose(); onClose(); }}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              ...(modal.type === 'error'
                ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }
                : {}),
            }}
            className={modal.type !== 'error' ? 'btn-gold' : ''}>
            {modal.type === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   PRODUCT CARD  (guest-friendly food-app style)
───────────────────────────────────────────────── */
const CARD_H   = 200;
const IMG_H    = 120;
const NAME_H   =  42;
const FOOTER_H = CARD_H - IMG_H - NAME_H;

function ProductCard({ product, onAdd, isGuest }) {
  const [added, setAdded] = useState(false);

  const getImage = (p) => {
    if (p.image) {
      return p.image.startsWith('/uploads')
        ? `${process.env.REACT_APP_SOCKET_URL || ''}${p.image}`
        : p.image;
    }
    return CATEGORY_IMAGES[p.category] || CATEGORY_IMAGES['default'];
  };

  const handleAdd = () => {
    onAdd(product);
    if (isGuest) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  return (
    <div
      onClick={handleAdd}
      className="glass-card product-card"
      style={{ cursor: 'pointer', overflow: 'hidden', height: `${CARD_H}px`,
               display: 'flex', flexDirection: 'column', position: 'relative',
               transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
               border: added ? '1.5px solid rgba(16,185,129,0.6)' : undefined }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,175,55,0.18)';
        if (!added) e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
        if (!added) e.currentTarget.style.borderColor = '';
      }}
    >
      <div style={{ height: `${IMG_H}px`, flexShrink: 0, position: 'relative',
                    overflow: 'hidden', background: 'var(--bg-elevated)' }}>
        <img src={getImage(product)} alt={product.name} className="product-card-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                   transition: 'transform 0.3s', transform: added ? 'scale(1.04)' : 'scale(1)' }}
          onError={e => { e.target.src = CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES['default']; }} />
        {/* Badges */}
        {product.isVegetarian && (
          <span style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.65)',
                         borderRadius: '4px', padding: '2px 5px', fontSize: '10px', lineHeight: 1 }}>🌱</span>
        )}
        {BREAD_CATEGORIES.includes(product.category) && (
          <span style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(212,175,55,0.88)',
                         borderRadius: '4px', padding: '2px 5px', fontSize: '9px', lineHeight: 1,
                         color: '#0D0D0D', fontWeight: 700 }}>🫓 Bread</span>
        )}
        {/* Added flash */}
        {added && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
          </div>
        )}
        {/* Add button overlay — guest only, bottom-right */}
        {isGuest && !added && (
          <div style={{ position: 'absolute', bottom: 6, right: 6,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#D4AF37,#B8960C)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.35)', fontSize: '18px', fontWeight: 700,
                        color: '#0D0D0D', lineHeight: 1 }}>+</div>
        )}
      </div>

      <div style={{ height: `${NAME_H}px`, flexShrink: 0, padding: '6px 10px 0', overflow: 'hidden' }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                    lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
      </div>

      <div style={{ height: `${FOOTER_H}px`, flexShrink: 0, padding: '0 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>
          {formatCurrency(product.price)}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          ⏱ {product.cookingTime}m
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   CART ITEM ROW
───────────────────────────────────────────────── */
function CartItem({ item, onInc, onDec, onRemove }) {
  return (
    <div style={{ padding: '9px 10px', borderRadius: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '6px', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                       flex: 1, lineHeight: 1.4 }}>{item.name}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)',
                       whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button onClick={onDec}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                   background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer',
                   fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                       minWidth: 22, textAlign: 'center' }}>{item.quantity}</span>
        <button onClick={onInc}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                   background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer',
                   fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
        <button onClick={onRemove}
          style={{ marginLeft: 'auto', background: 'none', border: 'none',
                   color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>✕</button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   ORDER CARD
   Inline expandable card — shows live countdown + full details.
   Newest active order is always fully expanded & auto-refreshes.
───────────────────────────────────────────────── */
function OrderCard({ order: initialOrder, products, estimatedMins, statusColor, isOpen, onToggle, isNewest }) {
  // Keep a local copy of the order so we can poll for live status updates
  const [order, setOrder] = useState(initialOrder);
  const [secsLeft, setSecsLeft] = useState(null);
  const timerRef  = useRef(null);
  const pollRef   = useRef(null);

  // Sync when parent passes a new version of the order (e.g. after GuestPastOrders re-fetches)
  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);

  const isActive = ['received','confirmed','preparing','ready','delivered'].includes(order.orderStatus);

  /* ── Live status polling: every 12s for active orders ── */
  useEffect(() => {
    if (!isActive) {
      clearInterval(pollRef.current);
      return;
    }
    const poll = async () => {
      try {
        const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || 'http://localhost:5000/api';
        const res  = await fetch(`${base}/orders/${order._id}`);
        if (!res.ok) return;
        const data = await res.json();
        const updated = data?.data || data?.order || data;
        if (updated?._id && updated.orderStatus !== order.orderStatus) {
          setOrder(updated);
        }
      } catch { /* silently ignore */ }
    };
    poll(); // immediate check on mount
    pollRef.current = setInterval(poll, 12000);
    return () => clearInterval(pollRef.current);
  }, [order._id, isActive, order.orderStatus]); // eslint-disable-line

  /* ── Countdown timer ── */
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!isActive) { setSecsLeft(null); return; }
    const elapsed   = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
    const remaining = estimatedMins * 60 - elapsed;
    setSecsLeft(Math.max(0, remaining));
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isActive, order.createdAt, estimatedMins]); // eslint-disable-line

  const mins = secsLeft !== null ? Math.floor(secsLeft / 60) : estimatedMins;
  const secs = secsLeft !== null ? secsLeft % 60 : 0;
  const progressPct = secsLeft !== null
    ? Math.max(0, Math.round(((estimatedMins * 60 - secsLeft) / (estimatedMins * 60)) * 100))
    : 100;

  const typeLabel =
    order.orderType === 'dine-in'  ? `🍽️ Dine-In — Table ${order.tableNumber}` :
    order.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway';

  const sc = statusColor(order.orderStatus);

  /* Status label shown to customer — friendly wording */
  const friendlyStatus = (s) => {
    const map = {
      received:  '📩 Order Received',
      confirmed: '✅ Confirmed',
      preparing: '👨‍🍳 Being Prepared',
      ready:     order.orderType === 'delivery' ? '🔔 Ready — Rider Coming' : '🔔 Ready!',
      delivered: '🛵 On the Way',
      completed: '✅ Delivered',
      cancelled: '❌ Cancelled',
    };
    return map[s] || s;
  };

  /* The newest active order is always fully expanded */
  const alwaysOpen = isNewest && isActive;

  return (
    <div style={{
      borderRadius: '14px', overflow: 'hidden',
      border: `1.5px solid ${alwaysOpen ? 'rgba(212,175,55,0.5)' : 'var(--border)'}`,
      background: 'var(--bg-elevated)',
      boxShadow: alwaysOpen ? '0 4px 20px rgba(212,175,55,0.12)' : 'none',
    }}>

      {/* ────────────────────────────────────────────────────
          NEWEST ACTIVE ORDER — fully visible without any tap
      ──────────────────────────────────────────────────── */}
      {alwaysOpen ? (
        <div style={{ padding: '18px' }}>

          {/* Top row: bill ID + status badge + time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '14px', color: 'var(--gold)', fontWeight: 700 }}>
                  {order.billId}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px',
                               background: 'rgba(16,185,129,0.15)', color: '#10B981',
                               border: '1px solid rgba(16,185,129,0.3)' }}>
                  ✅ Order Placed
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {typeLabel} · {formatDateTime(order.createdAt)}
              </div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                           background: `${sc}22`, color: sc, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {friendlyStatus(order.orderStatus)}
            </span>
          </div>

          {/* ── Live countdown timer ── */}
          {['received','confirmed','preparing'].includes(order.orderStatus) && (
            <div style={{
              padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '14px',
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                            letterSpacing: '0.12em', fontWeight: 700, marginBottom: '6px' }}>
                {order.orderType === 'delivery' ? '🛵 Estimated Delivery Time' : '⏱ Your Food Will Be Ready In'}
              </div>
              <div style={{ fontSize: '44px', fontWeight: 700, color: 'var(--gold)',
                            fontFamily: '"JetBrains Mono",monospace', lineHeight: 1, letterSpacing: '-1px' }}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                ~{estimatedMins} min {order.orderType === 'delivery' ? 'total (kitchen + delivery)' : 'until ready'}
              </div>
              <div style={{ marginTop: '10px', height: '5px', borderRadius: '999px',
                            background: 'rgba(212,175,55,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px',
                              background: 'linear-gradient(90deg,#D4AF37,#B8960C)',
                              width: `${progressPct}%`, transition: 'width 1s linear' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{progressPct}% elapsed</div>
            </div>
          )}

          {/* ── "Ready" banner ── */}
          {order.orderStatus === 'ready' && (
            <div style={{ padding: '14px', borderRadius: '12px', textAlign: 'center', marginBottom: '14px',
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)',
                          animation: 'none' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔔</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                {order.orderType === 'dine-in' ? 'Your food is ready! Being brought to your table.' :
                 order.orderType === 'takeaway' ? 'Your order is ready for pickup!' :
                 'Order is ready — rider is picking it up!'}
              </div>
            </div>
          )}

          {/* ── "On the way" banner for delivery ── */}
          {order.orderStatus === 'delivered' && order.orderType === 'delivery' && (
            <div style={{ padding: '14px', borderRadius: '12px', textAlign: 'center', marginBottom: '14px',
                          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🛵</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#3B82F6' }}>
                Your order is on the way!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Rider has picked up your order and is heading to you
              </div>
            </div>
          )}

          {/* ── "Delivered" success banner ── */}
          {order.orderStatus === 'completed' && order.orderType === 'delivery' && (
            <div style={{ padding: '14px', borderRadius: '12px', textAlign: 'center', marginBottom: '14px',
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎉</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981' }}>
                Delivered! Enjoy your meal.
              </div>
            </div>
          )}

          {/* ── "What You Ordered" — always visible, no tap needed ── */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase',
                          fontWeight: 700, letterSpacing: '0.1em', marginBottom: '10px' }}>
              🍽️ What You Ordered
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {order.items?.map((item, i) => {
                const prod = products.find(p => p._id === (item.product?._id || item.product));
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 13px', borderRadius: '9px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                        <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
                          × {item.quantity}
                        </span>
                      </div>
                      {prod?.cookingTime && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ⏱ {prod.cookingTime} min prep time
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bill total ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 4px', borderTop: '1px solid var(--border)', marginBottom: '14px',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span>
          </div>

          {/* ── What happens next — hide when order is fully done ── */}
          {!['completed','cancelled'].includes(order.orderStatus) && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px', marginBottom: '8px',
              background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <div style={{ fontSize: '10px', color: '#3B82F6', textTransform: 'uppercase',
                            fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
                📋 What Happens Next
              </div>
              {[
                { icon: '📩', text: 'Order received by kitchen', done: true },
                { icon: '👨‍🍳',
                  text: `Kitchen cooking your food (~${Math.max(1, estimatedMins - (order.orderType === 'delivery' ? 20 : order.orderType === 'takeaway' ? 5 : 0))} min)`,
                  done: ['ready','delivered','completed'].includes(order.orderStatus) },
                order.orderType === 'delivery'
                  ? { icon: '🛵', text: 'Rider picks up & brings to you (~20 min)',
                      done: ['delivered','completed'].includes(order.orderStatus) }
                  : order.orderType === 'takeaway'
                  ? { icon: '🥡', text: 'Order packed — please come collect',
                      done: ['ready','completed'].includes(order.orderStatus) }
                  : { icon: '🍽️', text: `Food brought to Table ${order.tableNumber}`,
                      done: ['ready','completed'].includes(order.orderStatus) },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px',
                                      marginBottom: i < 2 ? '8px' : 0 }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{step.done ? '✅' : step.icon}</span>
                  <span style={{ fontSize: '12px', lineHeight: 1.5,
                                 color: step.done ? 'var(--text-primary)' : 'var(--text-muted)',
                                 fontWeight: step.done ? 600 : 400 }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
            🔄 Status updates every 12 seconds
          </div>
        </div>

      ) : (
        /* ────────────────────────────────────────────────────
           ALL OTHER ORDERS — compact collapsible card
        ──────────────────────────────────────────────────── */
        <>
          <div
            onClick={onToggle}
            style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex',
                     justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '13px',
                               color: 'var(--gold)', fontWeight: 700 }}>{order.billId}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {typeLabel} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {formatDateTime(order.createdAt)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column',
                          alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span>
              <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                             background: `${sc}22`, color: sc }}>{friendlyStatus(order.orderStatus)}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>
              {isOpen ? '▲' : '▼'}
            </span>
          </div>

          {isOpen && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px',
                          display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Active but not newest: compact timer */}
              {isActive && ['received','confirmed','preparing'].includes(order.orderStatus) && (
                <div style={{ padding: '12px', borderRadius: '8px', textAlign: 'center',
                              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase',
                                fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {order.orderType === 'delivery' ? '🛵 Estimated Delivery' : '⏱ Estimated Prep Time'}
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--gold)',
                                fontFamily: '"JetBrains Mono",monospace' }}>
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </div>
                </div>
              )}

              {/* Status banners for completed states */}
              {!isActive && (
                <div style={{ padding: '8px 12px', borderRadius: '7px', textAlign: 'center',
                              background: order.orderStatus === 'cancelled' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                              border: `1px solid ${order.orderStatus === 'cancelled' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                  <span style={{ fontSize: '12px', fontWeight: 700,
                                 color: order.orderStatus === 'cancelled' ? '#EF4444' : '#10B981' }}>
                    {order.orderStatus === 'delivered' ? '✅ Delivered' :
                     order.orderStatus === 'completed' ? '✅ Completed' :
                     order.orderStatus === 'ready'     ? '🔔 Ready for Pickup' :
                     order.orderStatus === 'cancelled' ? '❌ Cancelled' : `✅ ${order.orderStatus}`}
                  </span>
                </div>
              )}

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  🍽️ Items Ordered
                </div>
                {order.items?.map((item, i) => {
                  const prod = products.find(p => p._id === (item.product?._id || item.product));
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                          padding: '8px 10px', borderRadius: '7px', background: 'var(--bg-surface)',
                                          border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '5px' }}>× {item.quantity}</span>
                        {prod?.cookingTime && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>⏱ {prod.cookingTime} min</div>
                        )}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bill totals */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px',
                            display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {order.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Discount</span>
                    <span style={{ fontSize: '11px', color: '#10B981' }}>− {formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                {order.deliveryCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🛵 Delivery</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatCurrency(order.deliveryCharge)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px',
                              paddingTop: '5px', borderTop: '1px dashed var(--border)' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>TOTAL</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   GUEST PAST ORDERS PANEL
   Shows guest's own orders by name — no print button.
   Auto-polls every 20s so status updates appear live.
───────────────────────────────────────────────── */
function GuestPastOrders({ guestName, refreshKey = 0, products = [] }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || 'http://localhost:5000/api';
      const res  = await fetch(`${base}/orders/guest-orders?limit=200`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const all  = data?.data?.orders || data?.data || [];
      const mine = guestName && guestName !== 'Guest'
        ? all.filter(o =>
            o.customer?.name?.toLowerCase().trim() === guestName.toLowerCase().trim()
          )
        : [];
      setOrders(mine);
      // Auto-expand the most recent order when a new order is placed
      if (refreshKey > 0 && mine.length > 0) setExpanded(mine[0].billId);
    } catch {
      setOrders([]);
    }
    if (!silent) setLoading(false);
  }, [guestName, refreshKey]);

  // Initial load + reload on refreshKey change
  useEffect(() => { load(); }, [load]);

  // Live polling every 15s so statuses update without the customer refreshing
  useEffect(() => {
    pollRef.current = setInterval(() => load(true), 15000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Auto-expand newest order whenever refreshKey increments (new order placed)
  useEffect(() => {
    if (refreshKey > 0 && orders.length > 0) {
      setExpanded(orders[0].billId);
    }
  }, [refreshKey]); // eslint-disable-line

  const statusColor = (s) => {
    const map = {
      received: '#3B82F6', confirmed: '#D4AF37', preparing: '#F59E0B',
      ready: '#10B981', delivered: '#3B82F6', completed: '#10B981', cancelled: '#EF4444',
    };
    return map[s] || '#888';
  };

  const calcMins = (order) => {
    if (!order) return 20;
    let maxCook = 15;
    order.items?.forEach(item => {
      const prod = products.find(p => p._id === (item.product?._id || item.product));
      const ct = prod?.cookingTime || 15;
      if (ct > maxCook) maxCook = ct;
    });
    if (order.orderType === 'delivery')  return maxCook + 20;
    if (order.orderType === 'takeaway')  return maxCook + 5;
    return maxCook;
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <p style={{ fontSize: '14px' }}>Loading your orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
        <p style={{ fontSize: '15px', marginBottom: '6px' }}>No orders yet</p>
        <p style={{ fontSize: '12px' }}>
          {guestName && guestName !== 'Guest'
            ? `No orders found for "${guestName}"`
            : 'Place an order and it will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {orders.map((order, idx) => (
        <OrderCard
          key={order._id}
          order={order}
          products={products}
          estimatedMins={calcMins(order)}
          statusColor={statusColor}
          isOpen={expanded === order.billId}
          onToggle={() => setExpanded(prev => prev === order.billId ? null : order.billId)}
          isNewest={idx === 0}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   MOBILE CART PANEL — fully scrollable, no clipping
───────────────────────────────────────────────── */
function MobileCartPanel({
  cart, cartCount, subtotal, tax, total, grandTotal,
  products, hasBreadItems, breadCount, setBreadCount, breadPrice, setBreadPrice,
  payMethod, setPayMethod, payConfig, payDetails, setPayDetails,
  custForm, setCustForm, submitting,
  dispatch, handlePlaceClick, DELIVERY_CHARGE, PAYMENT_METHODS,
  isGuest, guestName,
}) {
  return (
    <div className="glass-card" style={{ width: '100%', borderRadius: '12px' }}>

      {/* Cart header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '17px',
                     color: 'var(--text-primary)', margin: 0 }}>
          {isGuest ? (
            <span>👤 {guestName || 'Guest'}</span>
          ) : cart.orderType === 'dine-in' && cart.tableNumber
            ? `🍽️ Table ${cart.tableNumber}`
            : cart.orderType === 'delivery' ? '🛵 Delivery Order' : '🥡 Takeaway'}
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)',
                       padding: '3px 10px', borderRadius: '999px' }}>
          {cartCount} item{cartCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Delivery customer form */}
      {cart.orderType === 'delivery' && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', fontWeight: 700, marginBottom: '2px' }}>
            Delivery Details
          </p>
          {[['name','Customer Name'],['phone','Phone *'],['address','Delivery Address'],['deliveryZone','Zone / Area']].map(([k,l]) => (
            <input key={k} className="input-dark" placeholder={l} value={custForm[k]}
              onChange={e => setCustForm({ ...custForm, [k]: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px', width: '100%' }} />
          ))}
        </div>
      )}

      {/* Cart items */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cart.items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '48px 0', gap: '10px',
                        color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '42px' }}>🛒</span>
            <p style={{ fontSize: '14px' }}>Your cart is empty</p>
            <p style={{ fontSize: '12px' }}>Go to Menu tab and tap an item to add</p>
          </div>
        ) : cart.items.map(item => (
          <CartItem key={item.product} item={item}
            onInc={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity + 1 }))}
            onDec={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity - 1 }))}
            onRemove={() => dispatch(removeItem(item.product))} />
        ))}
      </div>

      {/* Order summary + payment */}
      {cart.items.length > 0 && (
        <div style={{ padding: '0 14px 32px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />

          {/* Bread section */}
          {hasBreadItems && (
            <div style={{ marginBottom: '12px', padding: '11px 13px', borderRadius: '10px',
                          background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px' }}>🫓 Bread (add after meal)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>Qty eaten</span>
                <button onClick={() => setBreadCount(c => Math.max(0, c - 1))}
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)',
                           background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{breadCount}</span>
                <button onClick={() => setBreadCount(c => c + 1)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)',
                           background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>+</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>Price per bread</span>
                <input type="number" min="0" className="input-dark" value={breadPrice}
                  onChange={e => setBreadPrice(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', padding: '5px 9px', borderRadius: '8px', fontSize: '13px', textAlign: 'right' }} />
              </div>
              {breadCount > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
                  🫓 {breadCount} × Rs.{breadPrice} = Rs.{breadCount * breadPrice}
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
            {[
              ['Subtotal', formatCurrency(subtotal)],
              [`Tax (${cart.taxPercent}%)`, formatCurrency(tax)],
              ...(breadCount > 0 ? [[`🫓 Bread ×${breadCount}`, formatCurrency(breadCount * breadPrice)]] : []),
              ...(cart.orderType === 'delivery' ? [['🛵 Delivery Charge', formatCurrency(DELIVERY_CHARGE)]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Discount — staff only */}
          {!isGuest && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>Discount (Rs)</span>
              <input type="number" min="0" className="input-dark" value={cart.discountAmount}
                onChange={e => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
                style={{ width: '90px', padding: '6px 10px', borderRadius: '8px',
                         fontSize: '13px', textAlign: 'right' }} />
            </div>
          )}

          <hr className="divider-gold" style={{ margin: '6px 0 12px' }} />

          {/* Grand total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: '16px' }}>
            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
              Payment Method
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.value}
                  onClick={() => { setPayMethod(pm.value); setPayDetails({ referenceNumber: '', senderName: '' }); }}
                  style={{ padding: '10px 8px', borderRadius: '9px', fontSize: '12px', fontWeight: 600,
                           cursor: 'pointer', border: '1.5px solid', textAlign: 'left',
                           transition: 'all 0.15s', minHeight: '44px',
                           background:  payMethod === pm.value ? 'rgba(212,175,55,0.14)' : 'var(--bg-elevated)',
                           borderColor: payMethod === pm.value ? 'var(--gold)'           : 'var(--border)',
                           color:       payMethod === pm.value ? 'var(--gold)'           : 'var(--text-secondary)' }}>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Online payment details */}
          {['jazzcash','easypaisa','bankaccount'].includes(payMethod) && (
            <div style={{ marginBottom: '14px', padding: '13px', borderRadius: '10px',
                          background: payMethod === 'jazzcash'  ? 'rgba(255,60,0,0.07)'
                                    : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.07)'
                                    : 'rgba(212,175,55,0.07)',
                          border: `1.5px solid ${
                            payMethod === 'jazzcash'  ? 'rgba(255,107,53,0.38)'
                          : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.38)'
                          : 'rgba(212,175,55,0.28)'}` }}>
              {payMethod === 'jazzcash' && payConfig?.jazzcash?.number && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF6B35', marginBottom: '3px' }}>📱 Send payment to JazzCash</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.05em' }}>{payConfig.jazzcash.number}</div>
                  {payConfig.jazzcash.accountName && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{payConfig.jazzcash.accountName}</div>}
                </div>
              )}
              {payMethod === 'easypaisa' && payConfig?.easypaisa?.number && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#009639', marginBottom: '3px' }}>💚 Send payment to Easypaisa</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.05em' }}>{payConfig.easypaisa.number}</div>
                  {payConfig.easypaisa.accountName && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{payConfig.easypaisa.accountName}</div>}
                </div>
              )}
              {payMethod === 'bankaccount' && payConfig?.bankaccount?.accountNumber && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>🏦 Bank Transfer Details</div>
                  {payConfig.bankaccount.accountTitle && <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>Name: <b>{payConfig.bankaccount.accountTitle}</b></div>}
                  {payConfig.bankaccount.bankName && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Bank: {payConfig.bankaccount.bankName}</div>}
                  {payConfig.bankaccount.accountNumber && <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px', fontFamily: '"JetBrains Mono",monospace' }}>Acc: {payConfig.bankaccount.accountNumber}</div>}
                  {payConfig.bankaccount.iban && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono",monospace' }}>IBAN: {payConfig.bankaccount.iban}</div>}
                </div>
              )}
              {payConfig?.whatsapp && (
                <div style={{ padding: '9px 11px', borderRadius: '8px', background: 'rgba(37,211,102,0.09)', border: '1px solid rgba(37,211,102,0.22)', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#25D366', fontWeight: 700 }}>📸 Send screenshot to WhatsApp</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>{payConfig.whatsapp}</div>
                </div>
              )}
              <input className="input-dark" placeholder="Transaction / Reference # (optional)"
                value={payDetails.referenceNumber}
                onChange={e => setPayDetails({ ...payDetails, referenceNumber: e.target.value })}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', fontSize: '13px', marginBottom: '7px' }} />
              <input className="input-dark" placeholder="Sender name (optional)"
                value={payDetails.senderName}
                onChange={e => setPayDetails({ ...payDetails, senderName: e.target.value })}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', fontSize: '13px' }} />
            </div>
          )}

          {/* Place Order button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button className="btn-outline-gold"
              onClick={() => { dispatch(clearCart()); setBreadCount(0); }}
              style={{ flex: 1, padding: '14px', borderRadius: '10px', fontSize: '13px',
                       fontWeight: 600, minHeight: '52px' }}>
              🗑 Clear
            </button>
            <button className="btn-gold" onClick={handlePlaceClick} disabled={submitting}
              style={{ flex: 2, padding: '14px', borderRadius: '10px', fontSize: '15px',
                       fontWeight: 700, minHeight: '52px' }}>
              {submitting ? 'Placing…' : '🧾 Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   GUEST SESSION HELPERS
   One persistent guest per device. Stored in localStorage
   so name survives page refresh. Only one table at a time.
───────────────────────────────────────────────── */
const GUEST_LS_KEY   = 'restaurant_guest_session';   // { name, tableNumber, tableOccupiedAt }

function loadGuestSession() {
  try { return JSON.parse(localStorage.getItem(GUEST_LS_KEY) || 'null'); }
  catch { return null; }
}
function saveGuestSession(session) {
  try { localStorage.setItem(GUEST_LS_KEY, JSON.stringify(session)); } catch {}
}
function clearGuestSession() {
  try { localStorage.removeItem(GUEST_LS_KEY); } catch {}
}

/* ─────────────────────────────────────────────────
   GUEST NAME PICKER
   Shows inline on the guest page — no redirect to login.
   Persists name to localStorage so it survives refresh.
───────────────────────────────────────────────── */
function GuestNamePicker({ onConfirm, restaurantName }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      backgroundImage:
        'radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.06) 0%, transparent 60%), ' +
        'radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.04) 0%, transparent 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Logo / Restaurant name */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>🍽️</div>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", serif', fontSize: '26px', fontWeight: 700,
            backgroundImage: 'linear-gradient(135deg, #E8C84A 0%, #D4AF37 50%, #B8960C 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '4px',
          }}>
            {restaurantName || 'Welcome'}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Customer Order
          </p>
        </div>

        {/* Name card */}
        <div className="glass-card-elevated" style={{ padding: '28px 24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            What's your name?
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Enter your name once — we'll remember you for this session.
            Tap "Change Guest" at the top to switch to a different person.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              ref={inputRef}
              className="input-dark"
              placeholder="e.g. John, Ali, Sarah…"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ padding: '13px 14px', borderRadius: '10px', fontSize: '16px', width: '100%' }}
              autoComplete="given-name"
            />
            <button
              type="submit"
              className="btn-gold"
              disabled={!name.trim()}
              style={{ padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                       opacity: name.trim() ? 1 : 0.45 }}
            >
              Continue →
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
          Your session will be saved — no need to re-enter your name on refresh.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   GUEST HEADER BAR
   Shows guest name, active table badge, and logout button.
───────────────────────────────────────────────── */
function GuestHeader({ guestName, restaurantName, activeTable, tableOccupiedAt, onSwitchCustomer }) {
  // Live "occupied since" clock
  const [elapsed, setElapsed] = React.useState('');
  React.useEffect(() => {
    if (!tableOccupiedAt) { setElapsed(''); return; }
    const tick = () => {
      const diffMs = Date.now() - new Date(tableOccupiedAt).getTime();
      const totalSecs = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      setElapsed(h > 0
        ? `${h}h ${String(m).padStart(2,'0')}m`
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tableOccupiedAt]);

  return (
    <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  position: 'sticky', top: 0, zIndex: 50, gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(212,175,55,0.15)',
                      border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2,
                        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
              {guestName || 'Guest'}
            </span>
            {activeTable && (
              <span style={{ fontSize: '10px', background: 'rgba(212,175,55,0.18)', color: 'var(--gold)',
                             border: '1px solid rgba(212,175,55,0.35)', borderRadius: '999px',
                             padding: '1px 7px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                🍽️ Table {activeTable}
                {elapsed && (
                  <span style={{ marginLeft: '4px', opacity: 0.8 }}>· ⏱ {elapsed}</span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={onSwitchCustomer}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                     fontSize: '11px', color: '#EF4444', textDecoration: 'underline', lineHeight: 1.4 }}
          >
            🔄 Change Guest
          </button>
        </div>
      </div>
      <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '15px', color: 'var(--gold)',
                    flexShrink: 0 }}>
        {restaurantName || 'My Restaurant'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   ORDER CONFIRMATION MODAL (staff only, not for guests)
───────────────────────────────────────────────── */
function OrderConfirmationModal({ order, products, isGuest, guestName, onClose, onViewOrders }) {
  const [secsLeft, setSecsLeft] = useState(null);
  const timerRef = useRef(null);

  const estimatedMins = React.useMemo(() => {
    if (!order) return 20;
    let maxCook = 15;
    order.items.forEach(item => {
      const prod = products.find(p => p._id === item.product?._id || p._id === item.product);
      const ct = prod?.cookingTime || 15;
      if (ct > maxCook) maxCook = ct;
    });
    if (order.orderType === 'delivery')  return maxCook + 20;
    if (order.orderType === 'takeaway')  return maxCook + 5;
    return maxCook;
  }, [order, products]);

  useEffect(() => {
    if (!order) return;
    setSecsLeft(estimatedMins * 60);
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [order, estimatedMins]);

  useEffect(() => {
    if (order) {
      try {
        sessionStorage.setItem('lastOrder', JSON.stringify({
          billId: order.billId, orderType: order.orderType,
          tableNumber: order.tableNumber, items: order.items,
          totalAmount: order.totalAmount, estimatedMins, createdAt: order.createdAt,
          customer: order.customer,
        }));
      } catch {}
    }
  }, [order, estimatedMins]);

  if (!order) return null;

  const mins = secsLeft !== null ? Math.floor(secsLeft / 60) : estimatedMins;
  const secs = secsLeft !== null ? secsLeft % 60 : 0;

  const typeLabel =
    order.orderType === 'dine-in'  ? `🍽️ Dine-In — Table ${order.tableNumber}` :
    order.orderType === 'delivery' ? '🛵 Home Delivery' : '🥡 Takeaway';

  const progressPct = secsLeft !== null
    ? Math.max(0, Math.round(((estimatedMins * 60 - secsLeft) / (estimatedMins * 60)) * 100))
    : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div className="glass-card-elevated" style={{
        width: '100%', maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))',
          borderBottom: '1px solid rgba(16,185,129,0.3)',
          padding: '24px 24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '26px', color: '#10B981', margin: '0 0 4px' }}>
            Order Placed!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {isGuest ? `Thank you, ${guestName || 'Guest'}!` : 'Order received by kitchen'}
          </p>
          <div style={{
            display: 'inline-block', marginTop: '10px',
            fontFamily: '"JetBrains Mono",monospace', fontSize: '13px', color: 'var(--gold)',
            background: 'rgba(212,175,55,0.12)', padding: '4px 14px', borderRadius: '999px',
            border: '1px solid rgba(212,175,55,0.3)',
          }}>
            {order.billId}
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{typeLabel}</span>
            {order.orderType === 'delivery' && order.customer?.address && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '160px', textAlign: 'right', lineHeight: 1.4 }}>
                📍 {order.customer.address}
              </span>
            )}
          </div>

          <div style={{
            padding: '16px', borderRadius: '12px',
            background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>
              {order.orderType === 'delivery' ? '🛵 Estimated Delivery Time' : '⏱ Estimated Prep Time'}
            </div>
            <div style={{ fontSize: '42px', fontWeight: 700, color: 'var(--gold)',
                          fontFamily: '"JetBrains Mono",monospace', lineHeight: 1 }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {order.orderType === 'delivery' ? `~${estimatedMins} min total` : `~${estimatedMins} min until ready`}
            </div>
            <div style={{ marginTop: '12px', height: '4px', borderRadius: '999px',
                          background: 'rgba(212,175,55,0.15)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: 'linear-gradient(90deg, #D4AF37, #B8960C)',
                width: `${progressPct}%`, transition: 'width 1s linear',
              }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase',
                          fontWeight: 700, letterSpacing: '0.1em', marginBottom: '10px' }}>
              🍽️ Your Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {order.items.map((item, i) => {
                const prod = products.find(p => p._id === item.product?._id || p._id === item.product);
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: '8px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                        <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
                          × {item.quantity}
                        </span>
                      </div>
                      {prod?.cookingTime && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>⏱ {prod.cookingTime} min prep</div>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {/* Action buttons — staff gets print, guest gets order more + view orders */}
          {isGuest ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={onClose}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                🍽️ Order More
              </button>
              <button className="btn-gold" onClick={onViewOrders}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
                📋 My Orders
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={onClose}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                Close
              </button>
              <button className="btn-gold" onClick={() => { printBill(order); onClose(); }}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
                🖨️ Print Bill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
export default function POSPage() {
  const dispatch   = useDispatch();
  const { items: products } = useSelector((s) => s.products);
  const cart       = useSelector((s) => s.cart);
  const subtotal   = useSelector(selectCartSubtotal);
  const tax        = useSelector(selectCartTax);
  const total      = useSelector(selectCartTotal);
  const cartCount  = useSelector(selectCartCount);
  const authUser   = useSelector((s) => s.auth.user);
  const { name: restaurantName } = useRestaurant();

  const isGuest   = !authUser;

  // ── Guest session: persisted in localStorage so name survives refresh ──
  // One guest at a time per device. Includes activeTable so we can warn
  // when the user tries to switch tables mid-session.
  const [guestSession,   setGuestSession]   = useState(() => isGuest ? loadGuestSession() : null);
  const guestName = guestSession?.name || '';

  const [showNamePicker, setShowNamePicker] = useState(
    isGuest && !loadGuestSession()
  );

  // Table-switch confirmation state
  const [pendingTable,   setPendingTable]   = useState(null);  // table number user tapped
  const [showTableConfirm, setShowTableConfirm] = useState(false);

  const [catFilter,    setCatFilter]    = useState('All');
  const [search,       setSearch]       = useState('');
  const [showBill,     setShowBill]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [payMethod,    setPayMethod]    = useState('cash');
  const [breadCount,   setBreadCount]   = useState(0);
  const [breadPrice,   setBreadPrice]   = useState(80);
  const [payConfig,    setPayConfig]    = useState(null);
  const [payDetails,   setPayDetails]   = useState({ referenceNumber: '', senderName: '' });
  const [appModal,     setAppModal]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  // Delivery form — persisted within session so it survives multiple orders
  const [custForm,     setCustForm]     = useState(() => {
    if (!isGuest) return { name: '', phone: '', address: '', deliveryZone: '' };
    try {
      const saved = JSON.parse(localStorage.getItem('restaurant_delivery_form') || 'null');
      return saved || { name: '', phone: '', address: '', deliveryZone: '' };
    } catch { return { name: '', phone: '', address: '', deliveryZone: '' }; }
  });
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);
  const [mobileTab,    setMobileTab]    = useState('menu');
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isGuest && guestName && guestName !== 'Guest') {
      setCustForm(prev => ({ ...prev, name: prev.name || guestName }));
    }
  }, [isGuest, guestName]);

  // Persist delivery form to localStorage whenever it changes (guest only)
  useEffect(() => {
    if (isGuest) {
      try { localStorage.setItem('restaurant_delivery_form', JSON.stringify(custForm)); } catch {}
    }
  }, [custForm, isGuest]);

  // ── Sync redux cart tableNumber with active session table on mount ──
  useEffect(() => {
    if (isGuest && guestSession?.tableNumber) {
      dispatch(setOrderType('dine-in'));
      dispatch(setTableNumber(guestSession.tableNumber));
    }
  }, []); // eslint-disable-line

  // ── Re-sync table whenever cart.tableNumber becomes null (e.g. after clearCart) ──
  // This ensures the guest stays on their locked table after placing an order.
  useEffect(() => {
    if (isGuest && guestSession?.tableNumber && !cart.tableNumber) {
      dispatch(setOrderType('dine-in'));
      dispatch(setTableNumber(guestSession.tableNumber));
    }
  }, [cart.tableNumber]); // eslint-disable-line

  // ── Called when name picker form is submitted ──
  const handleConfirmName = (name) => {
    const session = { name, tableNumber: null };
    saveGuestSession(session);
    setGuestSession(session);
    setCustForm(prev => ({ ...prev, name }));
    setShowNamePicker(false);
  };

  // ── Called when user selects a table ──
  // If same table is tapped again, do nothing.
  // If a different table is active, ask for confirmation.
  const handleTableSelect = (newTable) => {
    const currentTable = cart.tableNumber || guestSession?.tableNumber;
    // Clicking the already-selected table → no-op
    if (currentTable === newTable) return;
    if (isGuest && currentTable && currentTable !== newTable) {
      setPendingTable(newTable);
      setShowTableConfirm(true);
    } else {
      applyTableChange(newTable);
    }
  };

  const applyTableChange = (tableNum) => {
    dispatch(setTableNumber(tableNum));
    if (isGuest) {
      const now = new Date().toISOString();
      const updated = { ...guestSession, tableNumber: tableNum, tableOccupiedAt: now };
      saveGuestSession(updated);
      setGuestSession(updated);
    }
    setPendingTable(null);
    setShowTableConfirm(false);
  };

  // ── Switch to a different customer (clear session + show picker) ──
  const handleSwitchCustomer = () => {
    dispatch(clearCart());
    setBreadCount(0);
    setPayDetails({ referenceNumber: '', senderName: '' });
    clearGuestSession();
    setGuestSession(null);
    setCustForm({ name: '', phone: '', address: '', deliveryZone: '' });
    setMobileTab('menu');
    setShowNamePicker(true);
  };

  const closeModal   = () => setAppModal(null);
  const showAppModal = (type, title, message, onConfirm) =>
    setAppModal({ type, title, message, onConfirm });

  useEffect(() => { dispatch(fetchProducts({ available: true })); }, [dispatch]);

  useEffect(() => {
    fetch('/api/payment-config')
      .then(r => r.json())
      .then(d => setPayConfig(d?.data || null))
      .catch(() => {});
  }, []);

  const hasBreadItems = cart.items.some(item => {
    const prod = products.find(p => p._id === item.product);
    return prod && BREAD_CATEGORIES.includes(prod.category);
  });

  const filtered = products.filter(p => {
    const matchCat  = catFilter === 'All' || p.category === catFilter;
    const matchText = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText && p.isAvailable && p.currentStock > 0;
  });

  const breadCharge = breadCount * breadPrice;
  const deliveryFee = cart.orderType === 'delivery' ? DELIVERY_CHARGE : 0;
  const grandTotal  = total + breadCharge + deliveryFee;

  const handleAdd = (product) => {
    dispatch(addItem({ product: product._id, name: product.name, price: product.price,
                       image: product.image, category: product.category }));
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const handlePlaceClick = () => {
    if (cart.items.length === 0)                                               { showAppModal('warning','Cart Empty','Please add items before placing an order.'); return; }
    if (cart.orderType === 'dine-in' && !cart.tableNumber)                     { showAppModal('warning','Table Required','Please select a table number for dine-in.'); return; }
    if (cart.orderType === 'delivery' && !custForm.phone)                      { showAppModal('warning','Phone Required','Customer phone is required for delivery.'); return; }
    if (payMethod === 'jazzcash'    && !payConfig?.jazzcash?.number)           { showAppModal('error','JazzCash Not Set','No JazzCash number configured.'); return; }
    if (payMethod === 'easypaisa'   && !payConfig?.easypaisa?.number)          { showAppModal('error','Easypaisa Not Set','No Easypaisa number configured.'); return; }
    if (payMethod === 'bankaccount' && !payConfig?.bankaccount?.accountNumber) { showAppModal('error','Bank Account Not Set','No bank account configured.'); return; }
    setConfirmModal(true);
  };

  const handleSubmitOrder = async () => {
    setConfirmModal(false);
    setSubmitting(true);
    const orderData = {
      orderType: cart.orderType,
      tableNumber: cart.tableNumber,
      items: cart.items.map(i => ({ product: i.product, quantity: i.quantity, specialInstructions: i.specialInstructions || '' })),
      customer: isGuest ? { ...custForm, name: custForm.name || guestName } : custForm,
      paymentMethod: payMethod,
      paymentDetails: ['jazzcash','easypaisa','bankaccount'].includes(payMethod) ? payDetails : undefined,
      discountAmount: isGuest ? 0 : cart.discountAmount,
      deliveryCharge: deliveryFee,
      breadIncluded: breadCount > 0,
      breadCharge: breadCharge,
      breadCount: breadCount,
    };
    const result = await dispatch(createOrder(orderData));
    setSubmitting(false);
    if (createOrder.fulfilled.match(result)) {
      dispatch(clearCart());
      setBreadCount(0);
      // Re-apply the table immediately so the guest's next order is pre-filled
      if (isGuest && result.payload.tableNumber) {
        setTimeout(() => {
          dispatch(setOrderType('dine-in'));
          dispatch(setTableNumber(result.payload.tableNumber));
        }, 0);
      }
      // Keep payDetails for next order unless it's an online payment
      if (!['jazzcash','easypaisa','bankaccount'].includes(payMethod)) {
        setPayDetails({ referenceNumber: '', senderName: '' });
      }
      setOrdersRefreshKey(k => k + 1);
      toast.success(`✅ Order ${result.payload.billId} placed!`);
      if (isGuest) {
        // Persist the table used for this order in the guest session
        if (result.payload.tableNumber) {
          const now = guestSession?.tableOccupiedAt || new Date().toISOString();
          const updated = { ...guestSession, tableNumber: result.payload.tableNumber, tableOccupiedAt: now };
          saveGuestSession(updated);
          setGuestSession(updated);
        }
        // Keep custForm (delivery details) so next order doesn't need re-entry
        // Guest: go directly to Orders tab — they'll see their order with full details
        setMobileTab('orders');
      } else {
        setShowBill(result.payload);
      }
    } else {
      showAppModal('error', 'Order Failed', result.payload || 'Failed to place order.');
    }
  };

  const mobileCartProps = {
    cart, cartCount, subtotal, tax, total, grandTotal,
    products, hasBreadItems, breadCount, setBreadCount, breadPrice, setBreadPrice,
    payMethod, setPayMethod, payConfig, payDetails, setPayDetails,
    custForm, setCustForm, submitting,
    dispatch, handlePlaceClick, DELIVERY_CHARGE, PAYMENT_METHODS,
    isGuest, guestName,
  };

  return (
    <div style={{
      ...(isGuest ? {
        minHeight: '100vh', background: 'var(--bg-base)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      } : {}),
    }}>
      {/* Show inline name picker when guest has no name yet */}
      {isGuest && showNamePicker && (
        <GuestNamePicker
          onConfirm={handleConfirmName}
          restaurantName={restaurantName}
        />
      )}

      {/* Main app — only shown once name is set */}
      {(!isGuest || !showNamePicker) && (
        <>
      {isGuest && <GuestHeader guestName={guestName} restaurantName={restaurantName} activeTable={guestSession?.tableNumber} tableOccupiedAt={guestSession?.tableOccupiedAt} onSwitchCustomer={handleSwitchCustomer} />}

      <div style={{ padding: isGuest ? '0 0 80px' : '0' }}>

        {/* ══════════════════ MOBILE LAYOUT ══════════════════ */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Sticky tab bar */}
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border)',
              position: 'sticky', top: isGuest ? '62px' : '0', zIndex: 20,
              background: 'var(--bg-base)',
            }}>
              {[
                { key: 'menu',   label: '🍽️ Menu'  },
                { key: 'cart',   label: '🛒 Cart', badge: cartCount > 0 ? cartCount : null },
                ...(isGuest ? [{ key: 'orders', label: '📋 My Orders' }] : []),
              ].map(tab => (
                <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                  style={{ flex: 1, padding: '13px', fontWeight: 700, fontSize: '13px', border: 'none',
                           cursor: 'pointer', position: 'relative',
                           background: mobileTab === tab.key ? 'var(--primary-muted)' : 'transparent',
                           color: mobileTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                           borderBottom: mobileTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent' }}>
                  {tab.label}
                  {tab.badge && (
                    <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '999px',
                                   padding: '1px 7px', fontSize: '11px', fontWeight: 700, marginLeft: '5px' }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── MENU TAB ── */}
            {mobileTab === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input className="input-dark" placeholder="Search menu..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '150px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }} />
                  <select className="select-dark" value={cart.orderType}
                    onChange={e => dispatch(setOrderType(e.target.value))}
                    style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="dine-in">🍽️ Dine In</option>
                    <option value="takeaway">🥡 Takeaway</option>
                    <option value="delivery">🛵 Delivery</option>
                  </select>
                  {cart.orderType === 'dine-in' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {isGuest && guestSession?.tableNumber && (
                        <div style={{
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                          background: 'rgba(212,175,55,0.15)', color: 'var(--gold)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          🔒 Locked: Table {guestSession.tableNumber}
                        </div>
                      )}
                      <select className="select-dark" value={cart.tableNumber || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val) handleTableSelect(val);
                          else dispatch(setTableNumber(null));
                        }}
                        style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                        <option value="">Table #</option>
                        {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px',
                              WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                               cursor: 'pointer', border: '1px solid', transition: 'all 0.18s', flexShrink: 0, minHeight: '36px',
                               background:  catFilter === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                               borderColor: catFilter === c ? 'transparent' : 'var(--border)',
                               color:       catFilter === c ? '#0D0D0D' : 'var(--text-secondary)' }}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Product grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                              gap: '10px', paddingBottom: '20px' }}>
                  {filtered.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', paddingTop: '60px',
                                  color: 'var(--text-muted)', fontSize: '13px' }}>
                      <div style={{ fontSize: '38px', marginBottom: '10px' }}>🍽️</div>
                      No items match your search
                    </div>
                  ) : filtered.map(p => (
                    <ProductCard key={p._id} product={p} onAdd={handleAdd} />
                  ))}
                </div>

                {/* Floating cart button */}
                {cartCount > 0 && (
                  <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                zIndex: 100, width: 'calc(100% - 32px)', maxWidth: '420px' }}>
                    <button className="btn-gold" onClick={() => setMobileTab('cart')}
                      style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px',
                               fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                               boxShadow: '0 4px 24px rgba(212,175,55,0.35)' }}>
                      <span>🛒 View Cart ({cartCount})</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CART TAB ── */}
            {mobileTab === 'cart' && (
              <div style={{ padding: '10px 10px 90px' }}>
                <MobileCartPanel {...mobileCartProps} />
              </div>
            )}

            {/* Sticky bottom bar on cart tab */}
            {mobileTab === 'cart' && cartCount > 0 && (
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
                background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
                padding: '10px 16px 20px', display: 'flex', gap: '10px',
              }}>
                <button className="btn-outline-gold"
                  onClick={() => { dispatch(clearCart()); setBreadCount(0); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                  🗑 Clear
                </button>
                <button className="btn-gold" onClick={handlePlaceClick} disabled={submitting}
                  style={{ flex: 3, padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                           display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span>{submitting ? 'Placing…' : '🧧 Place Order'}</span>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>{formatCurrency(grandTotal)}</span>
                </button>
              </div>
            )}

            {/* ── ORDERS TAB (guest only) ── */}
            {mobileTab === 'orders' && isGuest && (
              <div style={{ padding: '10px' }}>
                {/* Guest name header */}
                <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '10px',
                              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                              display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,175,55,0.15)',
                                border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {guestName && guestName !== 'Guest' ? guestName : 'Guest'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your order history</div>
                  </div>
                </div>
                <GuestPastOrders
                  guestName={guestName}
                  refreshKey={ordersRefreshKey}
                  products={products}
                />
              </div>
            )}
          </div>

        ) : (
          /* ══════════════════ DESKTOP LAYOUT ══════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column',
                        height: isGuest ? 'calc(100vh - 70px)' : 'calc(100vh - 112px)',
                        overflow: 'hidden', gap: '20px' }}>

            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

              {/* ════ LEFT — Menu ════ */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                            gap: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                  <input className="input-dark" placeholder="Search menu..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '160px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }} />
                  <select className="select-dark" value={cart.orderType}
                    onChange={e => dispatch(setOrderType(e.target.value))}
                    style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    <option value="dine-in">🍽️ Dine In</option>
                    <option value="takeaway">🥡 Takeaway</option>
                    <option value="delivery">🛵 Delivery</option>
                  </select>
                  {cart.orderType === 'dine-in' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {isGuest && guestSession?.tableNumber && (
                        <div style={{
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px',
                          background: 'rgba(212,175,55,0.15)', color: 'var(--gold)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          🔒 Table {guestSession.tableNumber} (locked)
                        </div>
                      )}
                      <select className="select-dark" value={cart.tableNumber || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val) handleTableSelect(val);
                          else dispatch(setTableNumber(null));
                        }}
                        style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                        <option value="">Table #</option>
                        {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                               cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                               background:  catFilter === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                               borderColor: catFilter === c ? 'transparent' : 'var(--border)',
                               color:       catFilter === c ? '#0D0D0D' : 'var(--text-secondary)' }}>
                      {c}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto',
                              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                              gridAutoRows: `${CARD_H}px`, gap: '10px',
                              alignContent: 'start', paddingBottom: '8px' }}>
                  {filtered.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', paddingTop: '60px',
                                  color: 'var(--text-muted)', fontSize: '13px' }}>
                      <div style={{ fontSize: '38px', marginBottom: '10px' }}>🍽️</div>
                      No items match your search
                    </div>
                  ) : filtered.map(p => (
                    <ProductCard key={p._id} product={p} onAdd={handleAdd} />
                  ))}
                </div>
              </div>

              {/* ════ RIGHT — Cart + Guest Orders ════ */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                            gap: '12px', overflow: 'hidden' }}>

                {isGuest && (
                  <DesktopGuestOrders guestName={guestName} refreshKey={ordersRefreshKey} products={products} />
                )}

                <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h3 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '17px', color: 'var(--text-primary)', margin: 0 }}>
                      {isGuest ? `👤 ${guestName}` : cart.orderType === 'dine-in' && cart.tableNumber
                        ? `Table ${cart.tableNumber}` : cart.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)',
                                   padding: '2px 9px', borderRadius: '999px' }}>
                      {cartCount} item{cartCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {cart.orderType === 'delivery' && (
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
                                  display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                      {[['name','Customer Name'],['phone','Phone *'],['address','Address'],['deliveryZone','Zone']].map(([k,l]) => (
                        <input key={k} className="input-dark" placeholder={l} value={custForm[k]}
                          onChange={e => setCustForm({ ...custForm, [k]: e.target.value })}
                          style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '12px', width: '100%' }} />
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto',
                                padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {cart.items.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                        <span style={{ fontSize: '38px' }}>🛒</span>
                        <p style={{ fontSize: '13px' }}>Cart is empty</p>
                        <p style={{ fontSize: '11px' }}>Tap a menu item to add</p>
                      </div>
                    ) : cart.items.map(item => (
                      <CartItem key={item.product} item={item}
                        onInc={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity + 1 }))}
                        onDec={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity - 1 }))}
                        onRemove={() => dispatch(removeItem(item.product))} />
                    ))}
                  </div>

                  {cart.items.length > 0 && (
                    <div style={{ flexShrink: 0, padding: '12px 14px',
                                  borderTop: '1px solid var(--border)', overflowY: 'auto', maxHeight: '55vh' }}>
                      {hasBreadItems && (
                        <div style={{ marginBottom: '10px', padding: '9px 12px', borderRadius: '8px',
                                      background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '6px' }}>🫓 Bread (after meal)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>Qty</span>
                            <button onClick={() => setBreadCount(c => Math.max(0, c - 1))}
                              style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--border)',
                                       background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}>−</button>
                            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{breadCount}</span>
                            <button onClick={() => setBreadCount(c => c + 1)}
                              style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid var(--border)',
                                       background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}>+</button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>Price/bread</span>
                            <input type="number" min="0" className="input-dark" value={breadPrice}
                              onChange={e => setBreadPrice(parseFloat(e.target.value) || 0)}
                              style={{ width: '70px', padding: '4px 7px', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }} />
                          </div>
                          {breadCount > 0 && (
                            <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--gold)', fontWeight: 600 }}>
                              🫓 {breadCount} × Rs.{breadPrice} = Rs.{breadCount * breadPrice}
                            </div>
                          )}
                        </div>
                      )}

                      {[
                        ['Subtotal', formatCurrency(subtotal)],
                        [`Tax (${cart.taxPercent}%)`, formatCurrency(tax)],
                        ...(breadCount > 0 ? [[`🫓 Bread ×${breadCount}`, formatCurrency(breadCount * breadPrice)]] : []),
                        ...(cart.orderType === 'delivery' ? [['🛵 Delivery', formatCurrency(DELIVERY_CHARGE)]] : []),
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{value}</span>
                        </div>
                      ))}

                      {!isGuest && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>Discount</span>
                          <input type="number" min="0" className="input-dark" value={cart.discountAmount}
                            onChange={e => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
                            style={{ width: '76px', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }} />
                        </div>
                      )}

                      <hr className="divider-gold" style={{ margin: '8px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(grandTotal)}</span>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase',
                                      letterSpacing: '0.1em', marginBottom: '6px' }}>Payment Method</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                          {PAYMENT_METHODS.map(pm => (
                            <button key={pm.value}
                              onClick={() => { setPayMethod(pm.value); setPayDetails({ referenceNumber: '', senderName: '' }); }}
                              style={{ padding: '6px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                                       cursor: 'pointer', border: '1px solid', textAlign: 'left', transition: 'all 0.15s',
                                       background:  payMethod === pm.value ? 'rgba(212,175,55,0.14)' : 'var(--bg-elevated)',
                                       borderColor: payMethod === pm.value ? 'var(--gold)' : 'var(--border)',
                                       color:       payMethod === pm.value ? 'var(--gold)' : 'var(--text-secondary)' }}>
                              {pm.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {['jazzcash','easypaisa','bankaccount'].includes(payMethod) && (
                        <div style={{ marginBottom: '10px', padding: '11px', borderRadius: '8px',
                                      background: payMethod === 'jazzcash' ? 'rgba(255,60,0,0.07)' : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.07)' : 'rgba(212,175,55,0.07)',
                                      border: `1px solid ${payMethod === 'jazzcash' ? 'rgba(255,107,53,0.38)' : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.38)' : 'rgba(212,175,55,0.28)'}` }}>
                          {payMethod === 'jazzcash' && payConfig?.jazzcash?.number && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B35', marginBottom: '2px' }}>📱 Send to JazzCash</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{payConfig.jazzcash.number}</div>
                              {payConfig.jazzcash.accountName && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{payConfig.jazzcash.accountName}</div>}
                            </div>
                          )}
                          {payMethod === 'easypaisa' && payConfig?.easypaisa?.number && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#009639', marginBottom: '2px' }}>💚 Send to Easypaisa</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{payConfig.easypaisa.number}</div>
                              {payConfig.easypaisa.accountName && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{payConfig.easypaisa.accountName}</div>}
                            </div>
                          )}
                          {payMethod === 'bankaccount' && payConfig?.bankaccount?.accountNumber && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', marginBottom: '2px' }}>🏦 Bank Transfer</div>
                              {payConfig.bankaccount.accountTitle && <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Name: <b>{payConfig.bankaccount.accountTitle}</b></div>}
                              {payConfig.bankaccount.bankName && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bank: {payConfig.bankaccount.bankName}</div>}
                              {payConfig.bankaccount.accountNumber && <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: '"JetBrains Mono",monospace' }}>Acc: {payConfig.bankaccount.accountNumber}</div>}
                              {payConfig.bankaccount.iban && <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono",monospace' }}>IBAN: {payConfig.bankaccount.iban}</div>}
                            </div>
                          )}
                          {payConfig?.whatsapp && (
                            <div style={{ padding: '7px', borderRadius: '6px', background: 'rgba(37,211,102,0.09)', border: '1px solid rgba(37,211,102,0.22)', marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', color: '#25D366', fontWeight: 700 }}>📸 Screenshot → WhatsApp</div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{payConfig.whatsapp}</div>
                            </div>
                          )}
                          <input className="input-dark" placeholder="Ref / Transaction # (optional)"
                            value={payDetails.referenceNumber}
                            onChange={e => setPayDetails({ ...payDetails, referenceNumber: e.target.value })}
                            style={{ width: '100%', padding: '6px 9px', borderRadius: '6px', fontSize: '11px', marginBottom: '5px' }} />
                          <input className="input-dark" placeholder="Sender name (optional)"
                            value={payDetails.senderName}
                            onChange={e => setPayDetails({ ...payDetails, senderName: e.target.value })}
                            style={{ width: '100%', padding: '6px 9px', borderRadius: '6px', fontSize: '11px' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-outline-gold"
                          onClick={() => { dispatch(clearCart()); setBreadCount(0); }}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px' }}>Clear</button>
                        <button className="btn-gold" onClick={handlePlaceClick} disabled={submitting}
                          style={{ flex: 2, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                          {submitting ? 'Placing…' : '🧾 Place Order'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TABLE SWITCH CONFIRMATION MODAL ── */}
      {showTableConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '380px', padding: '28px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '44px', marginBottom: '8px' }}>🍽️</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px',
                           color: 'var(--gold)', marginBottom: '6px' }}>
                Change Table?
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                You already have a session at this table
              </p>
            </div>

            {/* Table comparison */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center',
                            background: 'rgba(212,175,55,0.12)', border: '2px solid rgba(212,175,55,0.5)' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>🔒</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Current (Locked)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)' }}>Table {guestSession?.tableNumber}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Your active session</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '20px' }}>→</div>
              <div style={{ flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center',
                            background: 'rgba(239,68,68,0.07)', border: '2px solid rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>🆕</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Requesting</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>Table {pendingTable}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>New session</div>
              </div>
            </div>

            {/* Warning */}
            <div style={{ padding: '11px 13px', borderRadius: '9px', marginBottom: '18px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                          fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              ⚠️ <strong style={{ color: '#EF4444' }}>Are you sure?</strong> Switching to Table {pendingTable}
              will start a <strong>new session</strong>. Your order history for Table {guestSession?.tableNumber} stays
              in the Orders tab — but your current table lock changes.
              <br /><br />
              If you just want to <strong>add more items to Table {guestSession?.tableNumber}</strong>, tap
              <strong> Stay on Table {guestSession?.tableNumber}</strong> below.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-gold"
                onClick={() => { setPendingTable(null); setShowTableConfirm(false); }}
                style={{ flex: 2, padding: '13px', borderRadius: '9px', fontSize: '13px', fontWeight: 700 }}>
                🍽️ Stay on Table {guestSession?.tableNumber}
              </button>
              <button
                onClick={() => applyTableChange(pendingTable)}
                style={{ flex: 1, padding: '13px', borderRadius: '9px', fontSize: '12px', fontWeight: 600,
                         cursor: 'pointer', border: '1px solid rgba(239,68,68,0.4)',
                         background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                Switch to {pendingTable}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <AppModal modal={appModal} onClose={closeModal} />

      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated"
            style={{ width: '100%', maxWidth: '420px', padding: '26px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '34px', marginBottom: '6px' }}>🧾</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px', color: 'var(--gold)' }}>Confirm Order</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Review before placing</p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '13px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>Items</div>
              {cart.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name} × {item.quantity}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              {breadCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--gold)' }}>🫓 Bread ×{breadCount}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(breadCount * breadPrice)}</span>
                </div>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(212,175,55,0.2)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax ({cart.taxPercent}%)</span><span>{formatCurrency(tax)}</span>
              </div>
              {!isGuest && cart.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>− {formatCurrency(cart.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--gold)',
                            marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '15px' }}>
                <span>TOTAL</span><span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px',
                          background: 'var(--bg-surface)', padding: '9px 12px', borderRadius: '6px',
                          border: '1px solid var(--border)', marginBottom: '18px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Payment</span>
              <span style={{ fontWeight: 600, color: 'var(--gold)' }}>
                {PAYMENT_METHODS.find(m => m.value === payMethod)?.label || payMethod.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={() => setConfirmModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
              <button className="btn-gold" onClick={handleSubmitOrder} disabled={submitting}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                {submitting ? 'Placing…' : 'Confirm & Place'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff bill/print modal */}
      {showBill && !isGuest && (
        <OrderConfirmationModal
          order={showBill}
          products={products}
          isGuest={false}
          guestName={null}
          onClose={() => setShowBill(null)}
          onViewOrders={() => setShowBill(null)}
        />
      )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DESKTOP GUEST PAST ORDERS — collapsible sidebar
───────────────────────────────────────────────── */
function DesktopGuestOrders({ guestName, refreshKey = 0, products = [] }) {
  const [open,     setOpen]     = useState(false);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res  = await fetch(`${base}/orders/guest-orders?limit=200`);
      const data = await res.json();
      const all  = data?.data?.orders || data?.data || [];
      const mine = guestName && guestName !== 'Guest'
        ? all.filter(o => o.customer?.name?.toLowerCase().trim() === guestName.toLowerCase().trim())
        : [];
      setOrders(mine);
    } catch { setOrders([]); }
    if (!silent) setLoading(false);
  }, [guestName]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { if (open && refreshKey > 0) load(); }, [refreshKey]); // eslint-disable-line

  // Live polling when panel is open
  useEffect(() => {
    if (!open) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => load(true), 20000);
    return () => clearInterval(pollRef.current);
  }, [open, load]);

  const statusColor = (s) => {
    const map = {
      received: '#3B82F6', confirmed: '#D4AF37', preparing: '#F59E0B',
      ready: '#10B981', delivered: '#3B82F6', completed: '#10B981', cancelled: '#EF4444',
    };
    return map[s] || '#888';
  };

  const calcMins = (order) => {
    if (!order) return 20;
    let maxCook = 15;
    order.items?.forEach(item => {
      const prod = products.find(p => p._id === (item.product?._id || item.product));
      const ct = prod?.cookingTime || 15;
      if (ct > maxCook) maxCook = ct;
    });
    if (order.orderType === 'delivery')  return maxCook + 20;
    if (order.orderType === 'takeaway')  return maxCook + 5;
    return maxCook;
  };

  return (
    <div className="glass-card" style={{ flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                 cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {guestName && guestName !== 'Guest' ? guestName : 'Guest'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Your order history</div>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '0 12px 12px',
                      display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
          ) : orders.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No past orders found</p>
          ) : orders.map(order => {
            const sc = statusColor(order.orderStatus);
            return (
              <div key={order._id} onClick={() => setSelected(order)}
                style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)',
                         border: '1px solid var(--border)', cursor: 'pointer',
                         display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>{order.billId}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {order.items?.length} item(s) · {formatDateTime(order.createdAt)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(order.totalAmount)}</div>
                  <div style={{ fontSize: '10px', color: sc, fontWeight: 600, marginTop: '2px' }}>{order.orderStatus}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Order detail popup — no print button */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated"
            style={{ width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '18px', color: 'var(--gold)', margin: 0 }}>{selected.billId}</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDateTime(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                             background: `${statusColor(selected.orderStatus)}22`, color: statusColor(selected.orderStatus) }}>
                {selected.orderStatus?.toUpperCase()}
              </span>
            </div>

            {/* Delivery status info */}
            {selected.orderType === 'delivery' && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
                            fontSize: '12px', color: 'var(--text-secondary)' }}>
                📍 {selected.customer?.address || 'Delivery address on record'}
                {selected.customer?.deliveryZone && ` — ${selected.customer.deliveryZone}`}
              </div>
            )}

            {/* Items */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                🍽️ What You Ordered
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {selected.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px',
                                        padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-elevated)' }}>
                    <span>{item.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>× {item.quantity}</span></span>
                    <span style={{ color: 'var(--gold)' }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', marginBottom: '16px',
                          paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ color: 'var(--gold)' }}>{formatCurrency(selected.totalAmount)}</span>
            </div>

            {/* Close only — no print for guest */}
            <button className="btn-gold" onClick={() => setSelected(null)} style={{ width: '100%', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
