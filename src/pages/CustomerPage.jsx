/**
 * CustomerPage.jsx
 * ─────────────────────────────────────────────────────────────────
 * A beautiful, self-contained customer-facing page.
 *
 * Screens (managed by local state — no router needed):
 *   1. welcome   → Enter name + choose order type
 *   2. menu      → Browse menu, add to cart
 *   3. checkout  → Review cart, pick payment, place order
 *   4. tracking  → Live order status + full order details
 *
 * Routes: /customer   (dedicated) &  /guest  (alias from App.js)
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/slices/productSlice';
import { createOrder } from '../store/slices/orderSlice';
import {
  addItem, removeItem, updateQuantity,
  setTableNumber, setOrderType, setDiscount, clearCart,
  selectCartSubtotal, selectCartTax, selectCartTotal, selectCartCount,
} from '../store/slices/cartSlice';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { useRestaurant } from '../hooks/useRestaurant';

/* ─── constants ─────────────────────────────────────────────────── */
const CATEGORIES = [
  'All','Starters','Main Course','Grill & BBQ','Seafood',
  'Pasta & Rice','Pizza','Burgers','Salads','Soups',
  'Desserts','Beverages','Specials',
];
const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);
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

const STATUS_COLOR = {
  received:  '#3B82F6',
  confirmed: '#D4AF37',
  preparing: '#F59E0B',
  ready:     '#10B981',
  delivered: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
};
const FRIENDLY_STATUS = (s, type) => ({
  received:  '📩 Order Received',
  confirmed: '✅ Confirmed',
  preparing: '👨‍🍳 Being Prepared',
  ready:     type === 'delivery' ? '🔔 Ready — Rider Coming' : '🔔 Ready to Serve!',
  delivered: '🛵 On the Way',
  completed: '✅ Delivered',
  cancelled: '❌ Cancelled',
}[s] || s);

/* ═══════════════════════════════════════════════════════════════
   SCREEN 1 — WELCOME
═══════════════════════════════════════════════════════════════ */
function WelcomeScreen({ restaurantName, onStart }) {
  const [name,      setName]      = useState(sessionStorage.getItem('guestName') || '');
  const [orderType, setOType]     = useState('dine-in');
  const [tableNum,  setTableNum]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [address,   setAddress]   = useState('');
  const [error,     setError]     = useState('');

  const handleStart = () => {
    if (!name.trim())                              return setError('Please enter your name.');
    if (orderType === 'dine-in' && !tableNum)      return setError('Please select a table.');
    if (orderType === 'delivery' && !phone.trim()) return setError('Phone number is required for delivery.');
    sessionStorage.setItem('guestName', name.trim());
    onStart({ name: name.trim(), orderType, tableNum: Number(tableNum) || null, phone, address });
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: '20px', padding: '36px 32px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
      }}>
        {/* Logo / restaurant name */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>🍽️</div>
          <h1 style={{
            fontFamily: '"Cormorant Garamond",serif',
            fontSize: '28px', color: 'var(--gold)', margin: '0 0 4px',
          }}>{restaurantName}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Self-Order Portal
          </p>
        </div>

        {/* Name */}
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                        marginBottom: '6px' }}>Your Name *</label>
        <input
          className="input-dark"
          placeholder="Enter your name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px',
                   fontSize: '15px', marginBottom: '16px' }}
        />

        {/* Order type */}
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                        marginBottom: '8px' }}>Order Type *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px', marginBottom: '16px' }}>
          {[
            { v: 'dine-in',  label: '🍽️ Dine-In'  },
            { v: 'takeaway', label: '🥡 Takeaway' },
            { v: 'delivery', label: '🛵 Delivery'  },
          ].map(opt => (
            <button key={opt.v} onClick={() => { setOType(opt.v); setError(''); }}
              style={{
                padding: '12px 6px', borderRadius: '10px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700, border: '1.5px solid',
                transition: 'all 0.18s',
                background:  orderType === opt.v ? 'rgba(212,175,55,0.15)' : 'var(--bg-surface)',
                borderColor: orderType === opt.v ? 'var(--gold)'           : 'var(--border)',
                color:       orderType === opt.v ? 'var(--gold)'           : 'var(--text-secondary)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table (dine-in) */}
        {orderType === 'dine-in' && (
          <>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                            marginBottom: '6px' }}>Table Number *</label>
            <select className="select-dark" value={tableNum}
              onChange={e => { setTableNum(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px',
                       fontSize: '14px', marginBottom: '16px' }}>
              <option value="">— Select Table —</option>
              {TABLES.map(t => <option key={t} value={t}>Table {t}</option>)}
            </select>
          </>
        )}

        {/* Delivery details */}
        {orderType === 'delivery' && (
          <>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                            marginBottom: '6px' }}>Phone *</label>
            <input className="input-dark" placeholder="0300 1234567" value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px',
                       fontSize: '14px', marginBottom: '10px' }} />
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                            marginBottom: '6px' }}>Delivery Address</label>
            <input className="input-dark" placeholder="Street, area, city" value={address}
              onChange={e => { setAddress(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px',
                       fontSize: '14px', marginBottom: '16px' }} />
          </>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
                        color: '#ef4444', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <button className="btn-gold" onClick={handleStart}
          style={{ width: '100%', padding: '15px', borderRadius: '12px',
                   fontSize: '16px', fontWeight: 700, letterSpacing: '0.04em' }}>
          Browse Menu →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT CARD
═══════════════════════════════════════════════════════════════ */
function ProductCard({ product, qty, onAdd, onInc, onDec }) {
  const getImage = (p) => {
    if (p.image) {
      return p.image.startsWith('/uploads')
        ? `${process.env.REACT_APP_SOCKET_URL || ''}${p.image}`
        : p.image;
    }
    return CATEGORY_IMAGES[p.category] || CATEGORY_IMAGES['default'];
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1.5px solid ${qty > 0 ? 'rgba(212,175,55,0.5)' : 'var(--border)'}`,
      borderRadius: '14px', overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: qty > 0 ? '0 4px 16px rgba(212,175,55,0.12)' : 'none',
    }}>
      {/* Image */}
      <div style={{ position: 'relative', height: '130px', overflow: 'hidden',
                    background: 'var(--bg-surface)' }}>
        <img src={getImage(product)} alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES['default']; }} />
        {product.isVegetarian && (
          <span style={{ position: 'absolute', top: 6, right: 6,
                         background: 'rgba(0,0,0,0.65)', borderRadius: '4px',
                         padding: '2px 5px', fontSize: '10px' }}>🌱</span>
        )}
        {qty > 0 && (
          <div style={{ position: 'absolute', top: 6, left: 6,
                        background: 'linear-gradient(135deg,#D4AF37,#B8960C)',
                        borderRadius: '999px', padding: '2px 10px',
                        fontSize: '11px', fontWeight: 700, color: '#0D0D0D' }}>
            ×{qty}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 600,
                    color: 'var(--text-primary)', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '34px' }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
            {formatCurrency(product.price)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            ⏱ {product.cookingTime}m
          </span>
        </div>

        {/* Add / Qty controls */}
        {qty === 0 ? (
          <button onClick={onAdd}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer',
              background: 'linear-gradient(135deg,#D4AF37,#B8960C)',
              border: 'none', color: '#0D0D0D', fontWeight: 700, fontSize: '13px',
              letterSpacing: '0.02em',
            }}>
            + Add
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(212,175,55,0.1)', borderRadius: '8px', padding: '4px 6px',
                        border: '1px solid rgba(212,175,55,0.3)' }}>
            <button onClick={onDec}
              style={{ width: 30, height: 30, borderRadius: '6px', border: 'none',
                       background: 'var(--bg-surface)', color: 'var(--text-primary)',
                       cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>−</button>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gold)', minWidth: '24px',
                           textAlign: 'center' }}>{qty}</span>
            <button onClick={onInc}
              style={{ width: 30, height: 30, borderRadius: '6px', border: 'none',
                       background: 'var(--bg-surface)', color: 'var(--text-primary)',
                       cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCREEN 2 — MENU
═══════════════════════════════════════════════════════════════ */
function MenuScreen({ customerInfo, restaurantName, products, cart, cartCount,
                      grandTotal, dispatch, onCheckout, onChangeInfo }) {
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');
  const [showCart, setShowCart] = useState(false);
  const catRef = useRef(null);

  const filtered = products.filter(p => {
    const matchCat  = category === 'All' || p.category === category;
    const matchText = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText && p.isAvailable && p.currentStock > 0;
  });

  // Cart qty for a product
  const qtyOf = (productId) =>
    cart.items.find(i => i.product === productId)?.quantity || 0;

  const handleAdd = (product) => {
    dispatch(addItem({
      product: product._id, name: product.name,
      price: product.price, image: product.image, category: product.category,
    }));
  };

  const handleInc = (product) => {
    const q = qtyOf(product._id);
    dispatch(updateQuantity({ product: product._id, quantity: q + 1 }));
  };

  const handleDec = (product) => {
    const q = qtyOf(product._id);
    if (q <= 1) dispatch(removeItem(product._id));
    else dispatch(updateQuantity({ product: product._id, quantity: q - 1 }));
  };

  // Type label for header
  const typeLabel =
    customerInfo.orderType === 'dine-in'  ? `🍽️ Table ${customerInfo.tableNum}` :
    customerInfo.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex',
                  flexDirection: 'column' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onChangeInfo}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                       padding: '5px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
              ← Back
            </button>
            <div>
              <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '16px',
                            color: 'var(--gold)' }}>{restaurantName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                👤 {customerInfo.name} · {typeLabel}
              </div>
            </div>
          </div>
          {/* Cart button */}
          <button onClick={() => setShowCart(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
              background: cartCount > 0
                ? 'linear-gradient(135deg,#D4AF37,#B8960C)'
                : 'var(--bg-surface)',
              border: cartCount > 0 ? 'none' : '1px solid var(--border)',
              color: cartCount > 0 ? '#0D0D0D' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '13px', transition: 'all 0.18s',
            }}>
            🛒
            {cartCount > 0 && (
              <span style={{ fontWeight: 800 }}>{cartCount} · {formatCurrency(grandTotal)}</span>
            )}
          </button>
        </div>

        {/* Search */}
        <input className="input-dark" placeholder="🔍 Search menu..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }} />

        {/* Category pills */}
        <div ref={catRef} style={{
          display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '10px',
          paddingBottom: '2px', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                padding: '6px 14px', borderRadius: '999px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', border: '1px solid', flexShrink: 0,
                transition: 'all 0.15s',
                background:  category === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                borderColor: category === c ? 'transparent' : 'var(--border)',
                color:       category === c ? '#0D0D0D' : 'var(--text-secondary)',
              }}>{c}</button>
          ))}
        </div>
      </div>

      {/* ── Product grid ── */}
      <div style={{ flex: 1, padding: '14px 12px 120px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px', alignContent: 'start' }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', paddingTop: '60px',
                        color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</div>
            <p style={{ fontSize: '14px' }}>No items match your search</p>
          </div>
        ) : filtered.map(p => (
          <ProductCard
            key={p._id} product={p} qty={qtyOf(p._id)}
            onAdd={() => handleAdd(p)}
            onInc={() => handleInc(p)}
            onDec={() => handleDec(p)}
          />
        ))}
      </div>

      {/* ── Floating "View Cart" bar ── */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: '12px 16px 24px',
          background: 'linear-gradient(to top, var(--bg-base) 80%, transparent)',
        }}>
          <button className="btn-gold" onClick={() => setShowCart(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              fontSize: '16px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 28px rgba(212,175,55,0.4)',
            }}>
            <span>🛒 View Cart ({cartCount} items)</span>
            <span>{formatCurrency(grandTotal)}</span>
          </button>
        </div>
      )}

      {/* ── Cart slide-up panel ── */}
      {showCart && (
        <CartPanel
          cart={cart} cartCount={cartCount} grandTotal={grandTotal}
          customerInfo={customerInfo} dispatch={dispatch}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); onCheckout(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CART PANEL (slide-up modal)
═══════════════════════════════════════════════════════════════ */
function CartPanel({ cart, cartCount, grandTotal, customerInfo, dispatch, onClose, onCheckout }) {
  const subtotal    = useSelector(selectCartSubtotal);
  const tax         = useSelector(selectCartTax);
  const deliveryFee = cart.orderType === 'delivery' ? DELIVERY_CHARGE : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxHeight: '85vh', background: 'var(--bg-elevated)',
        borderRadius: '20px 20px 0 0', overflowY: 'auto',
        border: '1px solid rgba(212,175,55,0.2)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999,
                        background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '12px 20px 16px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '20px',
                       color: 'var(--text-primary)', margin: 0 }}>
            Your Cart
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--gold)',
                           background: 'rgba(212,175,55,0.1)', padding: '3px 10px',
                           borderRadius: '999px' }}>
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
                       fontSize: '22px', cursor: 'pointer', padding: '0 4px' }}>×</button>
          </div>
        </div>

        {/* Items */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cart.items.map(item => (
            <div key={item.product} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600,
                            color: 'var(--text-primary)' }}>{item.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gold)' }}>
                  {formatCurrency(item.price)}
                </p>
              </div>
              {/* Qty stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => {
                  if (item.quantity <= 1) dispatch(removeItem(item.product));
                  else dispatch(updateQuantity({ product: item.product, quantity: item.quantity - 1 }));
                }} style={{ width: 30, height: 30, borderRadius: '7px', border: '1px solid var(--border)',
                            background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer',
                            fontSize: '16px', fontWeight: 700 }}>−</button>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)',
                               minWidth: '22px', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity + 1 }))}
                  style={{ width: 30, height: 30, borderRadius: '7px', border: '1px solid var(--border)',
                           background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer',
                           fontSize: '16px', fontWeight: 700 }}>+</button>
              </div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--gold)',
                             minWidth: '72px', textAlign: 'right' }}>
                {formatCurrency(item.price * item.quantity)}
              </span>
              <button onClick={() => dispatch(removeItem(item.product))}
                style={{ background: 'none', border: 'none', color: '#EF4444',
                         cursor: 'pointer', fontSize: '16px', padding: '4px' }}>🗑</button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 10px' }} />
          {[
            ['Subtotal',              formatCurrency(subtotal)],
            [`Tax (${cart.taxPercent}%)`, formatCurrency(tax)],
            ...(deliveryFee > 0 ? [['🛵 Delivery Charge', formatCurrency(deliveryFee)]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px',
                        paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button className="btn-outline-gold"
              onClick={() => { dispatch(clearCart()); onClose(); }}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px' }}>
              🗑 Clear
            </button>
            <button className="btn-gold" onClick={onCheckout}
              style={{ flex: 2, padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 700 }}>
              Checkout →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCREEN 3 — CHECKOUT
═══════════════════════════════════════════════════════════════ */
function CheckoutScreen({ customerInfo, cart, grandTotal, restaurantName,
                          payConfig, submitting, dispatch, onBack, onPlaceOrder }) {
  const subtotal    = useSelector(selectCartSubtotal);
  const tax         = useSelector(selectCartTax);
  const deliveryFee = cart.orderType === 'delivery' ? DELIVERY_CHARGE : 0;

  const [payMethod,  setPayMethod]  = useState('cash');
  const [payDetails, setPayDetails] = useState({ referenceNumber: '', senderName: '' });
  const [error,      setError]      = useState('');

  const handlePlace = () => {
    if (payMethod === 'jazzcash'    && !payConfig?.jazzcash?.number)           { setError('JazzCash is not configured. Please choose another method.'); return; }
    if (payMethod === 'easypaisa'   && !payConfig?.easypaisa?.number)          { setError('Easypaisa is not configured. Please choose another method.'); return; }
    if (payMethod === 'bankaccount' && !payConfig?.bankaccount?.accountNumber) { setError('Bank account is not configured. Please choose another method.'); return; }
    onPlaceOrder(payMethod, payDetails);
  };

  const typeLabel =
    customerInfo.orderType === 'dine-in'  ? `🍽️ Dine-In — Table ${customerInfo.tableNum}` :
    customerInfo.orderType === 'delivery' ? '🛵 Home Delivery' : '🥡 Takeaway';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)',
                  display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0',  position: 'sticky', top: 0, zIndex: 10,
                    background: 'var(--bg-base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={onBack}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                     borderRadius: '8px', padding: '8px 12px', color: 'var(--text-secondary)',
                     cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            ← Menu
          </button>
          <div>
            <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px',
                         color: 'var(--text-primary)', margin: 0 }}>Checkout</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              {restaurantName} · {typeLabel}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 16px 120px',
                    display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Order summary card */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            📋 Order Summary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {cart.items.map(item => (
              <div key={item.product} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    × {item.quantity}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              ['Subtotal',              formatCurrency(subtotal)],
              [`Tax (${cart.taxPercent}%)`, formatCurrency(tax)],
              ...(deliveryFee > 0 ? [['🛵 Delivery', formatCurrency(deliveryFee)]] : []),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px',
                          paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--gold)' }}>
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            💳 Payment Method
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} onClick={() => { setPayMethod(pm.value); setError(''); setPayDetails({ referenceNumber: '', senderName: '' }); }}
                style={{
                  padding: '13px 10px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, border: '1.5px solid',
                  transition: 'all 0.15s', textAlign: 'left',
                  background:  payMethod === pm.value ? 'rgba(212,175,55,0.14)' : 'var(--bg-elevated)',
                  borderColor: payMethod === pm.value ? 'var(--gold)'           : 'var(--border)',
                  color:       payMethod === pm.value ? 'var(--gold)'           : 'var(--text-secondary)',
                }}>
                {pm.label}
              </button>
            ))}
          </div>

          {/* Digital payment account details */}
          {['jazzcash','easypaisa','bankaccount'].includes(payMethod) && payConfig && (
            <div style={{
              marginTop: '14px', padding: '14px', borderRadius: '10px',
              background: payMethod === 'jazzcash'  ? 'rgba(255,60,0,0.07)'
                        : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.07)'
                        : 'rgba(212,175,55,0.07)',
              border: `1.5px solid ${
                payMethod === 'jazzcash'  ? 'rgba(255,107,53,0.4)'
              : payMethod === 'easypaisa' ? 'rgba(0,150,57,0.4)'
              : 'rgba(212,175,55,0.3)'}`,
            }}>
              {payMethod === 'jazzcash' && payConfig.jazzcash?.number && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B35', marginBottom: '3px' }}>
                    📱 Send payment to JazzCash
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
                                fontFamily: '"JetBrains Mono",monospace' }}>
                    {payConfig.jazzcash.number}
                  </div>
                  {payConfig.jazzcash.accountName && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {payConfig.jazzcash.accountName}
                    </div>
                  )}
                </div>
              )}
              {payMethod === 'easypaisa' && payConfig.easypaisa?.number && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#009639', marginBottom: '3px' }}>
                    💚 Send payment to Easypaisa
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
                                fontFamily: '"JetBrains Mono",monospace' }}>
                    {payConfig.easypaisa.number}
                  </div>
                  {payConfig.easypaisa.accountName && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {payConfig.easypaisa.accountName}
                    </div>
                  )}
                </div>
              )}
              {payMethod === 'bankaccount' && payConfig.bankaccount?.accountNumber && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>
                    🏦 Bank Transfer
                  </div>
                  {payConfig.bankaccount.accountTitle && (
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      Name: <b>{payConfig.bankaccount.accountTitle}</b>
                    </div>
                  )}
                  {payConfig.bankaccount.bankName && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Bank: {payConfig.bankaccount.bankName}
                    </div>
                  )}
                  {payConfig.bankaccount.accountNumber && (
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
                                  fontFamily: '"JetBrains Mono",monospace' }}>
                      {payConfig.bankaccount.accountNumber}
                    </div>
                  )}
                  {payConfig.bankaccount.iban && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)',
                                  fontFamily: '"JetBrains Mono",monospace' }}>
                      IBAN: {payConfig.bankaccount.iban}
                    </div>
                  )}
                </div>
              )}
              {payConfig.whatsapp && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '12px',
                              background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#25D366', fontWeight: 700 }}>
                    📸 Send payment screenshot to WhatsApp
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)',
                                marginTop: '3px' }}>
                    {payConfig.whatsapp}
                  </div>
                </div>
              )}
              <input className="input-dark"
                placeholder="Transaction / Reference # (optional)"
                value={payDetails.referenceNumber}
                onChange={e => setPayDetails({ ...payDetails, referenceNumber: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px',
                         fontSize: '13px', marginBottom: '8px' }} />
              <input className="input-dark"
                placeholder="Sender name (optional)"
                value={payDetails.senderName}
                onChange={e => setPayDetails({ ...payDetails, senderName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
                        color: '#ef4444', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Fixed bottom place order */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '12px 16px 28px',
        background: 'linear-gradient(to top, var(--bg-base) 80%, transparent)',
      }}>
        <button className="btn-gold" onClick={handlePlace} disabled={submitting}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            fontSize: '16px', fontWeight: 700, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            opacity: submitting ? 0.7 : 1,
            boxShadow: '0 6px 28px rgba(212,175,55,0.4)',
          }}>
          <span>{submitting ? '⏳ Placing Order…' : '✅ Place Order'}</span>
          <span style={{ fontSize: '15px' }}>{formatCurrency(grandTotal)}</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCREEN 4 — ORDER TRACKING
═══════════════════════════════════════════════════════════════ */
function TrackingScreen({ order: initialOrder, products, restaurantName, onOrderMore }) {
  const [order,    setOrder]    = useState(initialOrder);
  const [secsLeft, setSecsLeft] = useState(null);
  const timerRef = useRef(null);
  const pollRef  = useRef(null);

  // Estimated time
  const estimatedMins = React.useMemo(() => {
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
  }, [order, products]);

  // Live polling
  useEffect(() => {
    const isActive = ['received','confirmed','preparing','ready','delivered'].includes(order?.orderStatus);
    if (!isActive) { clearInterval(pollRef.current); return; }
    const poll = async () => {
      try {
        const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || 'http://localhost:5000/api';
        const res  = await fetch(`${base}/orders/${order._id}`);
        if (!res.ok) return;
        const data = await res.json();
        const updated = data?.data || data?.order || data;
        if (updated?._id) setOrder(updated);
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 12000);
    return () => clearInterval(pollRef.current);
  }, [order?._id, order?.orderStatus]);

  // Countdown timer
  useEffect(() => {
    clearInterval(timerRef.current);
    const isActive = ['received','confirmed','preparing'].includes(order?.orderStatus);
    if (!isActive || !order?.createdAt) { setSecsLeft(null); return; }
    const elapsed   = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
    const remaining = estimatedMins * 60 - elapsed;
    setSecsLeft(Math.max(0, remaining));
    timerRef.current = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(timerRef.current); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [order?.orderStatus, order?.createdAt, estimatedMins]);

  if (!order) return null;

  const mins = secsLeft !== null ? Math.floor(secsLeft / 60) : estimatedMins;
  const secs = secsLeft !== null ? secsLeft % 60 : 0;
  const progressPct = secsLeft !== null
    ? Math.max(0, Math.round(((estimatedMins * 60 - secsLeft) / (estimatedMins * 60)) * 100))
    : 0;

  const sc           = STATUS_COLOR[order.orderStatus] || '#888';
  const statusLabel  = FRIENDLY_STATUS(order.orderStatus, order.orderType);
  const isActive     = ['received','confirmed','preparing','ready','delivered'].includes(order.orderStatus);
  const isDone       = ['completed','cancelled'].includes(order.orderStatus);

  const typeLabel =
    order.orderType === 'dine-in'  ? `🍽️ Dine-In — Table ${order.tableNumber}` :
    order.orderType === 'delivery' ? '🛵 Home Delivery' : '🥡 Takeaway';

  // Steps
  const steps = [
    { icon: '📩', text: 'Order received by kitchen', done: true },
    { icon: '✅', text: 'Order confirmed',
      done: ['confirmed','preparing','ready','delivered','completed'].includes(order.orderStatus) },
    { icon: '👨‍🍳', text: `Kitchen preparing your food (~${Math.max(1, estimatedMins - (order.orderType === 'delivery' ? 20 : 5))} min)`,
      done: ['ready','delivered','completed'].includes(order.orderStatus) },
    order.orderType === 'delivery'
      ? { icon: '🛵', text: 'Rider picks up & brings to you (~20 min)',
          done: ['delivered','completed'].includes(order.orderStatus) }
      : order.orderType === 'takeaway'
      ? { icon: '🥡', text: 'Order packed for pickup',
          done: ['ready','completed'].includes(order.orderStatus) }
      : { icon: '🍽️', text: `Served to Table ${order.tableNumber}`,
          done: ['ready','completed'].includes(order.orderStatus) },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)',
                  display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(212,175,55,0.2)',
        padding: '16px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '18px', color: 'var(--gold)' }}>
          {restaurantName}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '13px',
                        color: 'var(--gold)', fontWeight: 700 }}>
            {order.billId}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {formatDateTime(order.createdAt)}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 120px',
                    display: 'flex', flexDirection: 'column', gap: '14px',
                    maxWidth: '600px', margin: '0 auto', width: '100%' }}>

        {/* ── Big status badge ── */}
        <div style={{
          padding: '18px', borderRadius: '16px', textAlign: 'center',
          background: `${sc}14`, border: `2px solid ${sc}44`,
        }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>
            {order.orderStatus === 'received'  ? '📩' :
             order.orderStatus === 'confirmed' ? '✅' :
             order.orderStatus === 'preparing' ? '👨‍🍳' :
             order.orderStatus === 'ready'     ? '🔔' :
             order.orderStatus === 'delivered' ? '🛵' :
             order.orderStatus === 'completed' ? '🎉' : '❌'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: sc }}>{statusLabel}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {typeLabel}
          </div>
        </div>

        {/* ── Countdown timer ── */}
        {['received','confirmed','preparing'].includes(order.orderStatus) && (
          <div style={{
            padding: '18px', borderRadius: '14px', textAlign: 'center',
            background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                          letterSpacing: '0.12em', fontWeight: 700, marginBottom: '8px' }}>
              {order.orderType === 'delivery' ? '🛵 Estimated Delivery Time' : '⏱ Food Ready In'}
            </div>
            <div style={{ fontSize: '52px', fontWeight: 700, color: 'var(--gold)',
                          fontFamily: '"JetBrains Mono",monospace', lineHeight: 1 }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Estimated ~{estimatedMins} min
            </div>
            <div style={{ marginTop: '12px', height: '6px', borderRadius: '999px',
                          background: 'rgba(212,175,55,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '999px', transition: 'width 1s linear',
                            background: 'linear-gradient(90deg,#D4AF37,#B8960C)',
                            width: `${progressPct}%` }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {progressPct}% elapsed · updates every 12 s
            </div>
          </div>
        )}

        {/* ── Ready banner ── */}
        {order.orderStatus === 'ready' && (
          <div style={{ padding: '16px', borderRadius: '14px', textAlign: 'center',
                        background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.35)' }}>
            <div style={{ fontSize: '30px', marginBottom: '6px' }}>🔔</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#10B981' }}>
              {order.orderType === 'dine-in' ? 'Your food is on the way to your table!' :
               order.orderType === 'takeaway' ? 'Ready for pickup! Please collect at the counter.' :
               'Ready — Rider is picking it up!'}
            </div>
          </div>
        )}

        {/* ── Delivery on the way ── */}
        {order.orderStatus === 'delivered' && order.orderType === 'delivery' && (
          <div style={{ padding: '16px', borderRadius: '14px', textAlign: 'center',
                        background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.35)' }}>
            <div style={{ fontSize: '30px', marginBottom: '6px' }}>🛵</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#3B82F6' }}>
              Rider is on the way to you!
            </div>
          </div>
        )}

        {/* ── Delivered ── */}
        {order.orderStatus === 'completed' && (
          <div style={{ padding: '16px', borderRadius: '14px', textAlign: 'center',
                        background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '30px', marginBottom: '6px' }}>🎉</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#10B981' }}>
              {order.orderType === 'delivery' ? 'Delivered! Enjoy your meal 😊' :
               'Order completed! Thank you for dining with us!'}
            </div>
          </div>
        )}

        {/* ── What You Ordered ── */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            🍽️ What You Ordered
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {order.items?.map((item, i) => {
              const prod = products.find(p => p._id === (item.product?._id || item.product));
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.name}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        × {item.quantity}
                      </span>
                    </div>
                    {prod?.cookingTime && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ⏱ {prod.cookingTime} min prep
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '2px' }}>
                        📝 {item.specialInstructions}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)',
                                 flexShrink: 0 }}>
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bill breakdown */}
          <div style={{ marginTop: '14px', paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              ['Subtotal',              formatCurrency(order.subtotal)],
              [`Tax (${order.taxPercentage}%)`, formatCurrency(order.taxAmount)],
              ...(order.discountAmount > 0  ? [['Discount', `– ${formatCurrency(order.discountAmount)}`]] : []),
              ...(order.deliveryCharge > 0  ? [['🛵 Delivery', formatCurrency(order.deliveryCharge)]] : []),
              ...(order.breadCharge > 0     ? [['🫓 Bread', formatCurrency(order.breadCharge)]] : []),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px',
                          paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment */}
          <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payment Method</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
                           textTransform: 'capitalize' }}>
              {PAYMENT_METHODS.find(m => m.value === order.paymentMethod)?.label || order.paymentMethod}
            </span>
          </div>
        </div>

        {/* ── Progress steps ── */}
        {!isDone && (
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
              📋 Order Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    background: step.done ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${step.done ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                  }}>
                    {step.done ? '✅' : step.icon}
                  </div>
                  <div style={{ paddingTop: '4px' }}>
                    <span style={{ fontSize: '13px', lineHeight: 1.5,
                                   color: step.done ? 'var(--text-primary)' : 'var(--text-muted)',
                                   fontWeight: step.done ? 600 : 400 }}>
                      {step.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Customer info ── */}
        {(order.customer?.name || order.customer?.phone || order.customer?.address) && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              👤 Your Details
            </div>
            {order.customer.name && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Name: <b style={{ color: 'var(--text-primary)' }}>{order.customer.name}</b>
              </div>
            )}
            {order.customer.phone && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Phone: {order.customer.phone}
              </div>
            )}
            {order.customer.address && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                📍 {order.customer.address}
                {order.customer.deliveryZone && ` — ${order.customer.deliveryZone}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '12px 16px 28px',
        background: 'linear-gradient(to top, var(--bg-base) 80%, transparent)',
        display: 'flex', gap: '10px',
        maxWidth: '600px', margin: '0 auto', width: '100%',
        left: '50%', transform: 'translateX(-50%)',
      }}>
        <button className="btn-outline-gold" onClick={onOrderMore}
          style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>
          🍽️ Order More
        </button>
        <button className="btn-gold"
          onClick={() => window.location.reload()}
          style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>
          📋 New Order
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT — CustomerPage
═══════════════════════════════════════════════════════════════ */
export default function CustomerPage() {
  const dispatch = useDispatch();
  const { items: products } = useSelector(s => s.products);
  const cart      = useSelector(s => s.cart);
  const subtotal  = useSelector(selectCartSubtotal);
  const tax       = useSelector(selectCartTax);
  const total     = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartCount);
  const { name: restaurantName } = useRestaurant();

  const [screen,      setScreen]      = useState('welcome'); // welcome | menu | checkout | tracking
  const [custInfo,    setCustInfo]    = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [payConfig,   setPayConfig]   = useState(null);

  useEffect(() => { dispatch(fetchProducts({ available: true })); }, [dispatch]);
  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => setPayConfig(d?.data || null)).catch(() => {});
  }, []);

  const deliveryFee = cart.orderType === 'delivery' ? DELIVERY_CHARGE : 0;
  const grandTotal  = total + deliveryFee;

  // ── Step 1 → 2 ──
  const handleStart = (info) => {
    setCustInfo(info);
    dispatch(setOrderType(info.orderType));
    if (info.tableNum) dispatch(setTableNumber(info.tableNum));
    setScreen('menu');
  };

  // ── Step 2 → 3 ──
  const handleGoCheckout = () => {
    if (cartCount === 0) return;
    setScreen('checkout');
  };

  // ── Step 3 → 4 ──
  const handlePlaceOrder = async (payMethod, payDetails) => {
    setSubmitting(true);
    const orderData = {
      orderType: custInfo.orderType,
      tableNumber: custInfo.tableNum,
      items: cart.items.map(i => ({
        product: i.product, quantity: i.quantity, specialInstructions: i.specialInstructions || '',
      })),
      customer: {
        name:         custInfo.name,
        phone:        custInfo.phone || '',
        address:      custInfo.address || '',
        deliveryZone: custInfo.deliveryZone || '',
      },
      paymentMethod:  payMethod,
      paymentDetails: ['jazzcash','easypaisa','bankaccount'].includes(payMethod) ? payDetails : undefined,
      discountAmount: 0,
      deliveryCharge: deliveryFee,
    };
    const result = await dispatch(createOrder(orderData));
    setSubmitting(false);
    if (createOrder.fulfilled.match(result)) {
      dispatch(clearCart());
      sessionStorage.setItem('guestName', custInfo.name);
      setPlacedOrder(result.payload);
      setScreen('tracking');
    }
  };

  // "Order More" from tracking screen → go back to menu, keep customer info
  const handleOrderMore = () => {
    setPlacedOrder(null);
    setScreen('menu');
  };

  // ── Render ──
  if (screen === 'welcome') {
    return <WelcomeScreen restaurantName={restaurantName} onStart={handleStart} />;
  }

  if (screen === 'menu') {
    return (
      <MenuScreen
        customerInfo={custInfo}
        restaurantName={restaurantName}
        products={products}
        cart={cart}
        cartCount={cartCount}
        grandTotal={grandTotal}
        dispatch={dispatch}
        onCheckout={handleGoCheckout}
        onChangeInfo={() => setScreen('welcome')}
      />
    );
  }

  if (screen === 'checkout') {
    return (
      <CheckoutScreen
        customerInfo={custInfo}
        cart={cart}
        grandTotal={grandTotal}
        restaurantName={restaurantName}
        payConfig={payConfig}
        submitting={submitting}
        dispatch={dispatch}
        onBack={() => setScreen('menu')}
        onPlaceOrder={handlePlaceOrder}
      />
    );
  }

  if (screen === 'tracking' && placedOrder) {
    return (
      <TrackingScreen
        order={placedOrder}
        products={products}
        restaurantName={restaurantName}
        onOrderMore={handleOrderMore}
      />
    );
  }

  return null;
}
