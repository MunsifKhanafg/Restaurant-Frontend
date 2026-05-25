import React, { useEffect, useState, useCallback } from 'react';
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
   PRODUCT CARD
───────────────────────────────────────────────── */
const CARD_H   = 200;
const IMG_H    = 120;
const NAME_H   =  42;
const FOOTER_H = CARD_H - IMG_H - NAME_H;

function ProductCard({ product, onAdd }) {
  const getImage = (p) => {
    if (p.image) {
      return p.image.startsWith('/uploads')
        ? `${process.env.REACT_APP_SOCKET_URL || ''}${p.image}`
        : p.image;
    }
    return CATEGORY_IMAGES[p.category] || CATEGORY_IMAGES['default'];
  };

  return (
    <div
      onClick={() => onAdd(product)}
      className="glass-card product-card"
      style={{ cursor: 'pointer', overflow: 'hidden', height: `${CARD_H}px`,
               display: 'flex', flexDirection: 'column',
               transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,175,55,0.18)';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = '';
      }}
    >
      <div style={{ height: `${IMG_H}px`, flexShrink: 0, position: 'relative',
                    overflow: 'hidden', background: 'var(--bg-elevated)' }}>
        <img src={getImage(product)} alt={product.name} className="product-card-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES['default']; }} />
        {product.isVegetarian && (
          <span style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.65)',
                         borderRadius: '4px', padding: '2px 5px', fontSize: '10px', lineHeight: 1 }}>🌱</span>
        )}
        {BREAD_CATEGORIES.includes(product.category) && (
          <span style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(212,175,55,0.88)',
                         borderRadius: '4px', padding: '2px 5px', fontSize: '9px', lineHeight: 1,
                         color: '#0D0D0D', fontWeight: 700 }}>🫓 Bread</span>
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

/* ─────────────────────────────────────────────────
   GUEST PAST ORDERS PANEL
   Shows guest's own orders by name — no print button
───────────────────────────────────────────────── */
function GuestPastOrders({ guestName }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${base}/orders/guest-orders?limit=200`);
        const data = await res.json();
        const all = data?.data?.orders || data?.data || [];
        // Filter to only this guest's orders by name match (case-insensitive)
        const mine = guestName && guestName !== 'Guest'
          ? all.filter(o =>
              o.customer?.name?.toLowerCase().trim() === guestName.toLowerCase().trim()
            )
          : [];
        setOrders(mine);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    load();
  }, [guestName]);

  const statusColor = (s) => {
    const map = {
      received: '#3B82F6', confirmed: '#D4AF37', preparing: '#F59E0B',
      ready: '#10B981', delivered: '#10B981', completed: '#10B981', cancelled: '#EF4444',
    };
    return map[s] || '#888';
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
        <p style={{ fontSize: '15px', marginBottom: '6px' }}>No past orders found</p>
        <p style={{ fontSize: '12px' }}>
          {guestName && guestName !== 'Guest'
            ? `No orders found for "${guestName}"`
            : 'Enter your name when ordering so we can track your history'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Order detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-card-elevated"
            style={{ width: '100%', maxWidth: '440px', maxHeight: '88vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '20px', color: 'var(--gold)', margin: 0 }}>
                  {selected.billId}
                </h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatDateTime(selected.createdAt)}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Status badge */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                             background: `${statusColor(selected.orderStatus)}22`,
                             border: `1px solid ${statusColor(selected.orderStatus)}55`,
                             color: statusColor(selected.orderStatus) }}>
                {selected.orderStatus?.toUpperCase()}
              </span>
            </div>

            {/* Order type / delivery info */}
            <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px',
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {selected.orderType === 'dine-in' ? `🍽️ Dine-In — Table ${selected.tableNumber}`
                 : selected.orderType === 'delivery' ? '🛵 Delivery'
                 : '🥡 Takeaway'}
              </div>
              {selected.orderType === 'delivery' && selected.customer?.address && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  📍 {selected.customer.address}
                  {selected.customer.deliveryZone ? ` — ${selected.customer.deliveryZone}` : ''}
                </div>
              )}
              {/* Delivery status info for guest */}
              {selected.orderType === 'delivery' && (
                <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
                              background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>
                    🚚 Delivery Status: {selected.orderStatus}
                  </div>
                  {selected.orderStatus === 'preparing' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Your food is being prepared in the kitchen
                    </div>
                  )}
                  {selected.orderStatus === 'ready' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Your order is ready and being picked up by the driver
                    </div>
                  )}
                  {selected.orderStatus === 'delivered' && (
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '3px' }}>
                      ✅ Your order has been delivered!
                    </div>
                  )}
                  {selected.orderStatus === 'completed' && (
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '3px' }}>
                      ✅ Order completed
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700,
                         letterSpacing: '0.1em', marginBottom: '10px' }}>Items Ordered</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {selected.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                      padding: '9px 12px', borderRadius: '8px',
                                      background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name} × {item.quantity}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              {selected.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Discount</span>
                  <span style={{ fontSize: '12px', color: '#10B981' }}>− {formatCurrency(selected.discountAmount)}</span>
                </div>
              )}
              {selected.deliveryCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🛵 Delivery</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(selected.deliveryCharge)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>TOTAL</span>
                <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gold)' }}>
                  {formatCurrency(selected.totalAmount)}
                </span>
              </div>
            </div>

            {/* Close button — NO PRINT for guest */}
            <button className="btn-gold" onClick={() => setSelected(null)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px',
                       fontWeight: 700, marginTop: '20px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Order cards list */}
      {orders.map(order => (
        <div key={order._id} onClick={() => setSelected(order)}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
                   borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                   transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '13px',
                           color: 'var(--gold)', fontWeight: 700 }}>{order.billId}</span>
            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                           background: `${statusColor(order.orderStatus)}22`,
                           color: statusColor(order.orderStatus) }}>
              {order.orderStatus}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {formatDateTime(order.createdAt)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                {order.orderType === 'delivery' ? ' · 🛵 Delivery' : order.orderType === 'dine-in' ? ` · Table ${order.tableNumber}` : ' · 🥡 Takeaway'}
              </div>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gold)' }}>
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────
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

      {/* Cart header — show guest name if guest */}
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

      {/* Order summary + payment — only shown when cart has items */}
      {cart.items.length > 0 && (
        <div style={{ padding: '0 14px 32px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />

          {/* Bread section — quantity + per-unit price (entered after meal) */}
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

          {/* Discount — only for non-guest (staff) */}
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

          {/* Place Order button — always reachable */}
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
   GUEST HEADER BAR (shown when accessed via /guest)
───────────────────────────────────────────────── */
function GuestHeader({ guestName, restaurantName }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
                  padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,175,55,0.15)',
                      border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '18px' }}>
          👤
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {guestName || 'Guest'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Customer Order</div>
        </div>
      </div>
      <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '16px', color: 'var(--gold)' }}>
        {restaurantName || 'My Restaurant'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
export default function POSPage() {
  const dispatch = useDispatch();
  const { items: products } = useSelector((s) => s.products);
  const cart      = useSelector((s) => s.cart);
  const subtotal  = useSelector(selectCartSubtotal);
  const tax       = useSelector(selectCartTax);
  const total     = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartCount);
  const authUser  = useSelector((s) => s.auth.user);
  const { name: restaurantName } = useRestaurant();

  // Detect if this is a guest session (no logged-in user, accessed via /guest)
  const isGuest = !authUser;
  // Get guest name from sessionStorage (set on LoginPage)
  const guestName = isGuest ? (sessionStorage.getItem('guestName') || 'Guest') : null;

  const [catFilter,    setCatFilter]    = useState('All');
  const [search,       setSearch]       = useState('');
  const [showBill,     setShowBill]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [payMethod,    setPayMethod]    = useState('cash');
  const [breadCount,   setBreadCount]   = useState(0);   // number of bread baskets after meal
  const [breadPrice,   setBreadPrice]   = useState(80);  // price per bread basket (editable by staff)
  const [payConfig,    setPayConfig]    = useState(null);
  const [payDetails,   setPayDetails]   = useState({ referenceNumber: '', senderName: '' });
  const [appModal,     setAppModal]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [custForm,     setCustForm]     = useState({ name: '', phone: '', address: '', deliveryZone: '' });
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);

  // Mobile tabs: 'menu' | 'cart' | 'orders' (orders only for guest)
  const [mobileTab, setMobileTab] = useState('menu');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // For guest delivery, pre-fill name from sessionStorage
  useEffect(() => {
    if (isGuest && guestName && guestName !== 'Guest') {
      setCustForm(prev => ({ ...prev, name: guestName }));
    }
  }, [isGuest, guestName]);

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
      setShowBill(result.payload);
      dispatch(clearCart());
      setBreadCount(0);
      setPayDetails({ referenceNumber: '', senderName: '' });
      toast.success(`🍽️ Order ${result.payload.billId} placed!`);
    } else {
      showAppModal('error', 'Order Failed', result.payload || 'Failed to place order.');
    }
  };

  /* shared cart props for mobile panel */
  const mobileCartProps = {
    cart, cartCount, subtotal, tax, total, grandTotal,
    products, hasBreadItems, breadCount, setBreadCount, breadPrice, setBreadPrice,
    payMethod, setPayMethod, payConfig, payDetails, setPayDetails,
    custForm, setCustForm, submitting,
    dispatch, handlePlaceClick, DELIVERY_CHARGE, PAYMENT_METHODS,
    isGuest, guestName,
  };

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    /*
      CRITICAL MOBILE SCROLL FIX:
      - The entire page is wrapped in a div with minHeight:'100vh' and overflowY:'auto'
      - For the guest view (no sidebar/header from MainLayout), this wrapper is the scroll root
      - For the authenticated POS view inside MainLayout, the <main> in MainLayout scrolls
      - NO fixed heights anywhere — everything is natural flow
    */
    <div style={{
      /* For guest (/guest route), this IS the page — give it full scroll capability */
      ...(isGuest ? {
        minHeight: '100vh',
        background: 'var(--bg-base)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      } : {}),
    }}>
      {/* Guest header bar */}
      {isGuest && <GuestHeader guestName={guestName} restaurantName={restaurantName} />}

      <div style={{ padding: isGuest ? '0 0 80px' : '0' }}>

        {/* ══════════════════ MOBILE LAYOUT ══════════════════ */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* ── Sticky tab bar ── */}
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border)',
              position: 'sticky', top: isGuest ? '62px' : '0', zIndex: 20,
              background: 'var(--bg-base)',
            }}>
              <button onClick={() => setMobileTab('menu')}
                style={{ flex: 1, padding: '13px', fontWeight: 700, fontSize: '13px', border: 'none',
                         cursor: 'pointer',
                         background: mobileTab === 'menu' ? 'var(--primary-muted)' : 'transparent',
                         color: mobileTab === 'menu' ? 'var(--primary)' : 'var(--text-muted)',
                         borderBottom: mobileTab === 'menu' ? '2px solid var(--primary)' : '2px solid transparent' }}>
                🍽️ Menu
              </button>
              <button onClick={() => setMobileTab('cart')}
                style={{ flex: 1, padding: '13px', fontWeight: 700, fontSize: '13px', border: 'none',
                         cursor: 'pointer', position: 'relative',
                         background: mobileTab === 'cart' ? 'var(--primary-muted)' : 'transparent',
                         color: mobileTab === 'cart' ? 'var(--primary)' : 'var(--text-muted)',
                         borderBottom: mobileTab === 'cart' ? '2px solid var(--primary)' : '2px solid transparent' }}>
                🛒 Cart
                {cartCount > 0 && (
                  <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '999px',
                                 padding: '1px 7px', fontSize: '11px', fontWeight: 700, marginLeft: '5px' }}>
                    {cartCount}
                  </span>
                )}
              </button>
              {/* Past Orders tab — guest only */}
              {isGuest && (
                <button onClick={() => setMobileTab('orders')}
                  style={{ flex: 1, padding: '13px', fontWeight: 700, fontSize: '13px', border: 'none',
                           cursor: 'pointer',
                           background: mobileTab === 'orders' ? 'var(--primary-muted)' : 'transparent',
                           color: mobileTab === 'orders' ? 'var(--primary)' : 'var(--text-muted)',
                           borderBottom: mobileTab === 'orders' ? '2px solid var(--primary)' : '2px solid transparent' }}>
                  📋 Orders
                </button>
              )}
            </div>

            {/* ── MENU TAB ── */}
            {mobileTab === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input className="input-dark" placeholder="Search menu..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '150px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }} />
                  {!isGuest && (
                    <>
                      <select className="select-dark" value={cart.orderType}
                        onChange={e => dispatch(setOrderType(e.target.value))}
                        style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                        <option value="dine-in">🍽️ Dine In</option>
                        <option value="takeaway">🥡 Takeaway</option>
                        <option value="delivery">🛵 Delivery</option>
                      </select>
                      {cart.orderType === 'dine-in' && (
                        <select className="select-dark" value={cart.tableNumber || ''}
                          onChange={e => dispatch(setTableNumber(Number(e.target.value)))}
                          style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                          <option value="">Table #</option>
                          {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
                        </select>
                      )}
                    </>
                  )}
                  {/* Guest order type selector */}
                  {isGuest && (
                    <select className="select-dark" value={cart.orderType}
                      onChange={e => dispatch(setOrderType(e.target.value))}
                      style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="dine-in">🍽️ Dine In</option>
                      <option value="takeaway">🥡 Takeaway</option>
                      <option value="delivery">🛵 Delivery</option>
                    </select>
                  )}
                  {isGuest && cart.orderType === 'dine-in' && (
                    <select className="select-dark" value={cart.tableNumber || ''}
                      onChange={e => dispatch(setTableNumber(Number(e.target.value)))}
                      style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Table #</option>
                      {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
                    </select>
                  )}
                </div>

                {/* Category pills — horizontally scrollable */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px',
                              WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
                              msOverflowStyle: 'none' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                               cursor: 'pointer', border: '1px solid', transition: 'all 0.18s', flexShrink: 0,
                               minHeight: '36px',
                               background:  catFilter === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                               borderColor: catFilter === c ? 'transparent' : 'var(--border)',
                               color:       catFilter === c ? '#0D0D0D' : 'var(--text-secondary)' }}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Product grid — natural height, no scroll trap */}
                <div style={{ display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
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

                {/* Floating cart button when items in cart */}
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

            {/* ── STICKY BOTTOM BAR — cart tab, when cart has items ── */}
            {mobileTab === 'cart' && cartCount > 0 && (
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
                background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
                padding: '10px 16px 20px',
                display: 'flex', gap: '10px',
              }}>
                <button className="btn-outline-gold"
                  onClick={() => { dispatch(clearCart()); setBreadCount(0); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                  🗑 Clear
                </button>
                <button className="btn-gold"
                  onClick={handlePlaceClick}
                  disabled={submitting}
                  style={{ flex: 3, padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                           display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span>{submitting ? 'Placing…' : '🧧 Place Order'}</span>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>{formatCurrency(grandTotal)}</span>
                </button>
              </div>
            )}

            {/* ── PAST ORDERS TAB (guest only) ── */}
            {mobileTab === 'orders' && isGuest && (
              <div style={{ padding: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '20px',
                               color: 'var(--text-primary)', margin: 0 }}>
                    Your Past Orders
                  </h2>
                  {guestName && guestName !== 'Guest' && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Showing orders for "{guestName}"
                    </p>
                  )}
                </div>
                <GuestPastOrders guestName={guestName} />
              </div>
            )}
          </div>

        ) : (
          /* ══════════════════ DESKTOP LAYOUT ══════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column',
                        height: isGuest ? 'calc(100vh - 70px)' : 'calc(100vh - 112px)',
                        overflow: 'hidden', gap: '20px' }}>

            {/* ── Two-column body ── */}
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
                    <select className="select-dark" value={cart.tableNumber || ''}
                      onChange={e => dispatch(setTableNumber(Number(e.target.value)))}
                      style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                      <option value="">Table #</option>
                      {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
                    </select>
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
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
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

              {/* ════ RIGHT — Desktop Cart + (for guest) Past Orders ════ */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                            gap: '12px', overflow: 'hidden' }}>

                {/* Guest past orders on desktop — collapsible section above cart */}
                {isGuest && (
                  <DesktopGuestOrders guestName={guestName} />
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
                                    alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-muted)', gap: '8px' }}>
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

                      {/* Discount only for staff, not guest */}
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
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Payment Method</div>
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

      {/* ══════════════════ MODALS ══════════════════ */}
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

      {/* Order success modal */}
      {showBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '380px', padding: '26px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>✅</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px', color: 'var(--gold)' }}>Order Placed!</h2>
              <p style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{showBill.billId}</p>
              {isGuest && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Thank you, {guestName}! Your order has been received.
                </p>
              )}
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '13px', marginBottom: '14px' }}>
              {showBill.items.map(i => (
                <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{i.name} × {i.quantity}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(i.price * i.quantity)}</span>
                </div>
              ))}
              <hr className="divider-gold" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--gold)' }}>
                <span>TOTAL</span><span>{formatCurrency(showBill.totalAmount)}</span>
              </div>
            </div>
            {/* Guest: no print button. Staff: show print button */}
            {isGuest ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-outline-gold" onClick={() => setShowBill(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  Close
                </button>
                <button className="btn-gold" onClick={() => { setShowBill(null); setMobileTab('orders'); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  📋 My Orders
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-outline-gold" onClick={() => setShowBill(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Close</button>
                <button className="btn-gold" onClick={() => { printBill(showBill); setShowBill(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>🖨️ Print Bill</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DESKTOP GUEST PAST ORDERS — collapsible sidebar widget
───────────────────────────────────────────────── */
function DesktopGuestOrders({ guestName }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${base}/orders/guest-orders?limit=200`);
      const data = await res.json();
      const all = data?.data?.orders || data?.data || [];
      const mine = guestName && guestName !== 'Guest'
        ? all.filter(o => o.customer?.name?.toLowerCase().trim() === guestName.toLowerCase().trim())
        : [];
      setOrders(mine);
    } catch { setOrders([]); }
    setLoading(false);
  }, [guestName]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const statusColor = (s) => {
    const map = { received: '#3B82F6', confirmed: '#D4AF37', preparing: '#F59E0B', ready: '#10B981', delivered: '#10B981', completed: '#10B981', cancelled: '#EF4444' };
    return map[s] || '#888';
  };

  return (
    <div className="glass-card" style={{ flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                 cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>📋 Your Past Orders</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '0 12px 12px',
                      display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
          ) : orders.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No past orders found</p>
          ) : orders.map(order => (
            <div key={order._id} onClick={() => setSelected(order)}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)',
                       border: '1px solid var(--border)', cursor: 'pointer',
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>{order.billId}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDateTime(order.createdAt)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(order.totalAmount)}</div>
                <div style={{ fontSize: '10px', color: statusColor(order.orderStatus) }}>{order.orderStatus}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Simple order detail modal — no print */}
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
            <div style={{ marginBottom: '12px' }}>
              <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                             background: `${statusColor(selected.orderStatus)}22`, color: statusColor(selected.orderStatus) }}>
                {selected.orderStatus?.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              {selected.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px',
                                      padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-elevated)' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span style={{ color: 'var(--gold)' }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ color: 'var(--gold)' }}>{formatCurrency(selected.totalAmount)}</span>
            </div>
            <button className="btn-gold" onClick={() => setSelected(null)} style={{ width: '100%', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
