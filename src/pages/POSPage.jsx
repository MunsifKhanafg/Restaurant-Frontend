import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/slices/productSlice';
import { createOrder } from '../store/slices/orderSlice';
import {
  addItem, removeItem, updateQuantity,
  setTableNumber, setOrderType, setDiscount, clearCart,
  selectCartSubtotal, selectCartTax, selectCartTotal, selectCartCount,
} from '../store/slices/cartSlice';
import { formatCurrency, printBill } from '../utils/helpers';
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
const BREAD_PRICE    = 80;
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
   TINY INLINE MODAL — no external dependency
───────────────────────────────────────────────── */
function AppModal({ modal, onClose }) {
  if (!modal) return null;
  const iconMap = { error: '❌', success: '✅', confirm: '⚠️', warning: '⚠️' };
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
   PRODUCT CARD — fixed-height, pixel-perfect
   Total height: 200px
     • image:   120px  (fixed)
     • name:     42px  (2-line clamp, fixed)
     • footer:   38px  (price + time)
───────────────────────────────────────────────── */
const CARD_H    = 200;
const IMG_H     = 120;
const NAME_H    =  42;   /* ~2 lines @ 13px / 1.55 lh */
const FOOTER_H  = CARD_H - IMG_H - NAME_H;   /* 38px */

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
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        height: `${CARD_H}px`,          /* ← fixed height — every card identical */
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
      }}
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
      {/* ── Image ── */}
      <div style={{ height: `${IMG_H}px`, flexShrink: 0, position: 'relative', overflow: 'hidden',
                    background: 'var(--bg-elevated)' }}>
        <img
          src={getImage(product)}
          alt={product.name}
          className="product-card-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES['default']; }}
        />
        {product.isVegetarian && (
          <span style={{ position: 'absolute', top: 5, right: 5,
                         background: 'rgba(0,0,0,0.65)', borderRadius: '4px',
                         padding: '2px 5px', fontSize: '10px', lineHeight: 1 }}>
            🌱
          </span>
        )}
        {BREAD_CATEGORIES.includes(product.category) && (
          <span style={{ position: 'absolute', top: 5, left: 5,
                         background: 'rgba(212,175,55,0.88)', borderRadius: '4px',
                         padding: '2px 5px', fontSize: '9px', lineHeight: 1,
                         color: '#0D0D0D', fontWeight: 700 }}>
            🫓 Bread
          </span>
        )}
      </div>

      {/* ── Name ── */}
      <div style={{ height: `${NAME_H}px`, flexShrink: 0, padding: '6px 10px 0',
                    overflow: 'hidden' }}>
        <p style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.45,
          /* 2-line clamp */
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.name}
        </p>
      </div>

      {/* ── Price / Time ── */}
      <div style={{ height: `${FOOTER_H}px`, flexShrink: 0,
                    padding: '0 10px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between' }}>
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
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '6px', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                       flex: 1, lineHeight: 1.4 }}>
          {item.name}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)',
                       whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button onClick={onDec}
          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)',
                   background: 'var(--bg-surface)', color: 'var(--text-primary)',
                   cursor: 'pointer', fontSize: 14, display: 'flex',
                   alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          −
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                       minWidth: 22, textAlign: 'center' }}>
          {item.quantity}
        </span>
        <button onClick={onInc}
          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)',
                   background: 'var(--bg-surface)', color: 'var(--text-primary)',
                   cursor: 'pointer', fontSize: 14, display: 'flex',
                   alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          +
        </button>
        <button onClick={onRemove}
          style={{ marginLeft: 'auto', background: 'none', border: 'none',
                   color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>
          ✕
        </button>
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

  const [catFilter,   setCatFilter]   = useState('All');
  const [search,      setSearch]      = useState('');
  const [showBill,    setShowBill]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [payMethod,   setPayMethod]   = useState('cash');
  const [breadOn,     setBreadOn]     = useState(false);
  const [payConfig,   setPayConfig]   = useState(null);
  const [payDetails,  setPayDetails]  = useState({ referenceNumber: '', senderName: '' });
  const [appModal,    setAppModal]    = useState(null);
  const [confirmModal,setConfirmModal]= useState(false);
  const [custForm,    setCustForm]    = useState({ name: '', phone: '', address: '', deliveryZone: '' });

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

  const breadCharge = breadOn ? BREAD_PRICE : 0;
  const deliveryFee = cart.orderType === 'delivery' ? DELIVERY_CHARGE : 0;
  const grandTotal  = total + breadCharge + deliveryFee;

  /* ── Handlers ── */
  const handleAdd = (product) => {
    dispatch(addItem({ product: product._id, name: product.name, price: product.price,
                       image: product.image, category: product.category }));
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const handlePlaceClick = () => {
    if (cart.items.length === 0) { showAppModal('warning','Cart Empty','Please add items before placing an order.'); return; }
    if (cart.orderType === 'dine-in' && !cart.tableNumber) { showAppModal('warning','Table Required','Please select a table number for dine-in.'); return; }
    if (cart.orderType === 'delivery' && !custForm.phone) { showAppModal('warning','Phone Required','Customer phone is required for delivery.'); return; }
    if (payMethod === 'jazzcash'    && !payConfig?.jazzcash?.number)        { showAppModal('error','JazzCash Not Set','No JazzCash number configured. Go to Settings → Payment to add it.'); return; }
    if (payMethod === 'easypaisa'   && !payConfig?.easypaisa?.number)       { showAppModal('error','Easypaisa Not Set','No Easypaisa number configured. Go to Settings → Payment to add it.'); return; }
    if (payMethod === 'bankaccount' && !payConfig?.bankaccount?.accountNumber) { showAppModal('error','Bank Account Not Set','No bank account configured. Go to Settings → Payment to add it.'); return; }
    setConfirmModal(true);
  };

  const handleSubmitOrder = async () => {
    setConfirmModal(false);
    setSubmitting(true);
    const orderData = {
      orderType: cart.orderType,
      tableNumber: cart.tableNumber,
      items: cart.items.map(i => ({ product: i.product, quantity: i.quantity, specialInstructions: i.specialInstructions || '' })),
      customer: custForm,
      paymentMethod: payMethod,
      paymentDetails: ['jazzcash','easypaisa','bankaccount'].includes(payMethod) ? payDetails : undefined,
      discountAmount: cart.discountAmount,
      deliveryCharge: deliveryFee,
      breadIncluded: breadOn,
      breadCharge: breadOn ? BREAD_PRICE : 0,
    };
    const result = await dispatch(createOrder(orderData));
    setSubmitting(false);
    if (createOrder.fulfilled.match(result)) {
      setShowBill(result.payload);
      dispatch(clearCart());
      setBreadOn(false);
      setPayDetails({ referenceNumber: '', senderName: '' });
      toast.success(`🍽️ Order ${result.payload.billId} placed!`);
    } else {
      showAppModal('error','Order Failed', result.payload || 'Failed to place order.');
    }
  };

  /* ── Layout note:
     The outer wrapper uses height: calc(100vh - 112px) so both columns fill the viewport.
     Left column: flex column, product grid is the only scrollable part (flex:1, overflowY:auto).
     Right column: fixed 340px width, flex column.
       • Cart items list: overflowY:auto, flex:1, min-height:0  ← critical for scroll
       • Totals footer: flexShrink:0 so it never disappears
  ── */
  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>

      {/* ════════════════ LEFT — Menu ════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>

        {/* Search + Order type + Table */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <input
            className="input-dark"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}
          />
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

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{
                padding: '4px 12px', borderRadius: '999px', fontSize: '11px',
                fontWeight: 600, cursor: 'pointer', border: '1px solid',
                transition: 'all 0.18s',
                background:   catFilter === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                borderColor:  catFilter === c ? 'transparent' : 'var(--border)',
                color:        catFilter === c ? '#0D0D0D' : 'var(--text-secondary)',
              }}>
              {c}
            </button>
          ))}
        </div>

        {/* ── Product grid — this is the ONLY scrollable zone on the left ── */}
        <div style={{
          flex: 1,
          minHeight: 0,           /* ← must have this so flex shrink works */
          overflowY: 'auto',
          /* grid: fill columns with 160px min, equal rows of CARD_H px */
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gridAutoRows: `${CARD_H}px`,   /* ← every row exactly card height */
          gap: '12px',
          alignContent: 'start',
          paddingBottom: '8px',
        }}>
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

      {/* ════════════════ RIGHT — Cart ════════════════ */}
      <div className="glass-card" style={{
        width: '340px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',   /* contain children */
      }}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexShrink: 0 }}>
          <h3 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '17px',
                       color: 'var(--text-primary)', margin: 0 }}>
            {cart.orderType === 'dine-in' && cart.tableNumber
              ? `Table ${cart.tableNumber}`
              : cart.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)',
                         padding: '2px 9px', borderRadius: '999px' }}>
            {cartCount} item{cartCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Delivery form */}
        {cart.orderType === 'delivery' && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            {[['name','Customer Name'],['phone','Phone *'],['address','Address'],['deliveryZone','Zone']].map(([k,l]) => (
              <input key={k} className="input-dark" placeholder={l}
                value={custForm[k]}
                onChange={e => setCustForm({ ...custForm, [k]: e.target.value })}
                style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '12px', width: '100%' }} />
            ))}
          </div>
        )}

        {/* ── Cart items — scrollable, flex:1, min-height:0 ── */}
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
            <CartItem
              key={item.product}
              item={item}
              onInc={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity + 1 }))}
              onDec={() => dispatch(updateQuantity({ product: item.product, quantity: item.quantity - 1 }))}
              onRemove={() => dispatch(removeItem(item.product))}
            />
          ))}
        </div>

        {/* ── Totals footer — always visible, never pushed off ── */}
        {cart.items.length > 0 && (
          <div style={{ flexShrink: 0, padding: '12px 14px',
                        borderTop: '1px solid var(--border)',
                        overflowY: 'auto', maxHeight: '55vh' }}>

            {/* Bread toggle */}
            {hasBreadItems && (
              <div style={{ marginBottom: '10px', padding: '9px 12px', borderRadius: '8px',
                            background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)' }}>🫓 Bread Basket</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Served with mains • {formatCurrency(BREAD_PRICE)}
                  </div>
                </div>
                {/* toggle */}
                <div onClick={() => setBreadOn(v => !v)}
                  style={{ width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                           background: breadOn ? 'var(--gold)' : 'var(--bg-elevated)',
                           border: '1px solid var(--border)', position: 'relative',
                           transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2,
                                left: breadOn ? 17 : 2, width: 14, height: 14,
                                borderRadius: '50%', transition: 'left 0.2s',
                                background: breadOn ? '#0D0D0D' : 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            {/* Line items */}
            {[
              ['Subtotal', formatCurrency(subtotal)],
              [`Tax (${cart.taxPercent}%)`, formatCurrency(tax)],
              ...(breadOn ? [['🫓 Bread', formatCurrency(BREAD_PRICE)]] : []),
              ...(cart.orderType === 'delivery' ? [['🛵 Delivery', formatCurrency(DELIVERY_CHARGE)]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{value}</span>
              </div>
            ))}

            {/* Discount input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>Discount</span>
              <input type="number" min="0" className="input-dark"
                value={cart.discountAmount}
                onChange={e => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
                style={{ width: '76px', padding: '4px 8px', borderRadius: '6px',
                         fontSize: '12px', textAlign: 'right' }} />
            </div>

            <hr className="divider-gold" style={{ margin: '8px 0' }} />

            {/* Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold)' }}>
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* Payment method grid */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', marginBottom: '6px' }}>
                Payment Method
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.value}
                    onClick={() => { setPayMethod(pm.value); setPayDetails({ referenceNumber: '', senderName: '' }); }}
                    style={{
                      padding: '6px 8px', borderRadius: '7px', fontSize: '11px',
                      fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      textAlign: 'left', transition: 'all 0.15s',
                      background:   payMethod === pm.value ? 'rgba(212,175,55,0.14)' : 'var(--bg-elevated)',
                      borderColor:  payMethod === pm.value ? 'var(--gold)'           : 'var(--border)',
                      color:        payMethod === pm.value ? 'var(--gold)'           : 'var(--text-secondary)',
                    }}>
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Digital payment details */}
            {['jazzcash','easypaisa','bankaccount'].includes(payMethod) && (
              <div style={{
                marginBottom: '10px', padding: '11px', borderRadius: '8px',
                background: payMethod === 'jazzcash'    ? 'rgba(255,60,0,0.07)'
                          : payMethod === 'easypaisa'   ? 'rgba(0,150,57,0.07)'
                          : 'rgba(212,175,55,0.07)',
                border: `1px solid ${
                  payMethod === 'jazzcash'    ? 'rgba(255,107,53,0.38)'
                : payMethod === 'easypaisa'   ? 'rgba(0,150,57,0.38)'
                : 'rgba(212,175,55,0.28)'}`,
              }}>
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
                    {payConfig.bankaccount.accountTitle  && <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>Name: <b>{payConfig.bankaccount.accountTitle}</b></div>}
                    {payConfig.bankaccount.bankName      && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bank: {payConfig.bankaccount.bankName}</div>}
                    {payConfig.bankaccount.accountNumber && <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: '"JetBrains Mono",monospace' }}>Acc: {payConfig.bankaccount.accountNumber}</div>}
                    {payConfig.bankaccount.iban          && <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono",monospace' }}>IBAN: {payConfig.bankaccount.iban}</div>}
                  </div>
                )}
                {payConfig?.whatsapp && (
                  <div style={{ padding: '7px', borderRadius: '6px', background: 'rgba(37,211,102,0.09)',
                                border: '1px solid rgba(37,211,102,0.22)', marginBottom: '8px' }}>
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

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-outline-gold"
                onClick={() => { dispatch(clearCart()); setBreadOn(false); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                Clear
              </button>
              <button className="btn-gold" onClick={handlePlaceClick} disabled={submitting}
                style={{ flex: 2, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                {submitting ? 'Placing…' : '🧾 Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════ App Alert Modal ════════ */}
      <AppModal modal={appModal} onClose={closeModal} />

      {/* ════════ Confirm Order Modal ════════ */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated"
            style={{ width: '100%', maxWidth: '420px', padding: '26px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '34px', marginBottom: '6px' }}>🧾</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px', color: 'var(--gold)' }}>
                Confirm Order
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Review before placing
              </p>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '13px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase',
                            fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
                Items
              </div>
              {cart.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                      fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name} × {item.quantity}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              {breadOn && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--gold)' }}>🫓 Bread Basket</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(BREAD_PRICE)}</span>
                </div>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(212,175,55,0.2)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax ({cart.taxPercent}%)</span><span>{formatCurrency(tax)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>− {formatCurrency(cart.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                            color: 'var(--gold)', marginTop: '8px', paddingTop: '8px',
                            borderTop: '1px solid var(--border)', fontSize: '15px' }}>
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
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                Cancel
              </button>
              <button className="btn-gold" onClick={handleSubmitOrder} disabled={submitting}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                {submitting ? 'Placing…' : 'Confirm & Place'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Bill Modal ════════ */}
      {showBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '380px', padding: '26px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>✅</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: '22px', color: 'var(--gold)' }}>Order Placed!</h2>
              <p style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {showBill.billId}
              </p>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={() => setShowBill(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Close</button>
              <button className="btn-gold" onClick={() => { printBill(showBill); setShowBill(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                🖨️ Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
