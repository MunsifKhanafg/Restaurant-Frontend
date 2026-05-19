import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Grill & BBQ', 'Seafood', 'Pasta & Rice', 'Pizza', 'Burgers', 'Salads', 'Soups', 'Desserts', 'Beverages', 'Specials'];

// Shared gold logo
function AurumLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="21" cy="21" r="20" stroke="#D4AF37" strokeWidth="1.2" fill="none" opacity="0.6"/>
      <circle cx="21" cy="21" r="18" fill="url(#guestLogoGrad)"/>
      <path d="M16 9 L16 17 Q16 19 17.5 19.5 L17.5 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M14 9 L14 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M16 9 L16 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M18 9 L18 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M26 9 L26 16 Q30 18 30 21 L26 22 L26 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M13 21 Q21 23.5 29 21" stroke="#0D0D0D" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5"/>
      <defs>
        <radialGradient id="guestLogoGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#E8C84A"/>
          <stop offset="100%" stopColor="#A07808"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function GuestOrderPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState('menu'); // 'menu' | 'checkout' | 'success'
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [search, setSearch] = useState('');
  // Dynamic restaurant name loaded from DB
  const [restaurantName, setRestaurantName] = useState(process.env.REACT_APP_RESTAURANT_NAME || 'My Restaurant');

  useEffect(() => {
    // Load restaurant config for name
    api.get('/restaurant-config').then(({ data }) => {
      if (data?.data?.name) setRestaurantName(data.data.name);
    }).catch(() => {});

    // Load menu
    api.get('/products').then(({ data }) => {
      setProducts((data.data || []).filter(p => p.isAvailable !== false && p.stockStatus !== 'finished'));
    }).catch(() => {
      toast.error('Could not load menu. Please try again.');
    }).finally(() => setLoading(false));
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i._id === product._id);
      if (ex) return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    toast.success(`${product.name} added!`, { duration: 1200 });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = products.filter(p => {
    const matchCat = category === 'All' || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (orderType === 'dine-in' && !tableNumber) { toast.error('Please enter table number'); return; }
    if (!customerName.trim()) { toast.error('Please enter your name'); return; }
    setPlacing(true);
    try {
      const payload = {
        items: cart.map(i => ({ product: i._id, name: i.name, price: i.price, quantity: i.qty })),
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        paymentMethod: 'cash',
        isGuestOrder: true,
      };
      const { data } = await api.post('/orders', payload);
      setOrderId(data.data?.billId || data.data?._id || 'Order placed');
      setStep('success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order. Please try again.');
    }
    setPlacing(false);
  };

  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#D4AF37', marginBottom: '8px' }}>Order Placed!</h1>
          <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>Your order has been received by the kitchen.</p>
          <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Order ID</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '20px', color: '#D4AF37', fontWeight: '700' }}>{orderId}</div>
          </div>
          <div style={{ color: '#888', fontSize: '13px', marginBottom: '24px', lineHeight: 1.7 }}>
            Show this order ID to the waiter or staff.<br/>
            Thank you for choosing <strong style={{ color: '#D4AF37' }}>{restaurantName}</strong>!
          </div>
          <button onClick={() => { setCart([]); setStep('menu'); setOrderId(''); }}
            style={{ padding: '13px 32px', borderRadius: '10px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            Order Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,175,55,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AurumLogo size={36} />
          <div>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', fontWeight: '700', background: 'linear-gradient(135deg, #E8C84A, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{restaurantName}</div>
            <div style={{ fontSize: '9px', color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Guest Order</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate('/login')} style={{ fontSize: '12px', color: '#888', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer' }}>
            Staff Login →
          </button>
          {step === 'menu' && cart.length > 0 && (
            <button onClick={() => setStep('checkout')}
              style={{ position: 'relative', padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛒 Cart
              <span style={{ background: '#0D0D0D', color: '#D4AF37', borderRadius: '999px', padding: '1px 6px', fontSize: '11px', fontWeight: '700' }}>{cartCount}</span>
            </button>
          )}
          {step === 'checkout' && (
            <button onClick={() => setStep('menu')} style={{ fontSize: '12px', color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer' }}>
              ← Menu
            </button>
          )}
        </div>
      </header>

      {step === 'menu' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '8px', marginBottom: '16px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ flexShrink: 0, padding: '7px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', background: category === cat ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : 'rgba(255,255,255,0.07)', color: category === cat ? '#0D0D0D' : '#aaa', transition: 'all 0.2s' }}>
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search menu..."
            style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', marginBottom: '20px', outline: 'none', boxSizing: 'border-box' }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888', fontSize: '14px' }}>Loading menu...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888', fontSize: '14px' }}>No items found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', paddingBottom: cart.length > 0 ? '100px' : '20px' }}>
              {filtered.map(product => {
                const inCart = cart.find(i => i._id === product._id);
                return (
                  <div key={product._id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '140px', background: 'rgba(212,175,55,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>🍽️</div>
                    )}
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px', marginBottom: '4px' }}>{product.name}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', lineHeight: 1.5, minHeight: '32px' }}>{product.description?.slice(0, 60) || ''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '700', color: '#D4AF37', fontSize: '15px' }}>{formatCurrency(product.price)}</span>
                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => updateQty(product._id, -1)}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span style={{ fontWeight: '700', color: '#D4AF37', minWidth: '16px', textAlign: 'center' }}>{inCart.qty}</span>
                            <button onClick={() => updateQty(product._id, 1)}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)}
                            style={{ padding: '7px 16px', borderRadius: '7px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cart.length > 0 && (
            <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, width: 'calc(100% - 40px)', maxWidth: '500px' }}>
              <button onClick={() => setStep('checkout')}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(212,175,55,0.35)' }}>
                <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                <span>Proceed to Order → {formatCurrency(cartTotal)}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'checkout' && (
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 20px' }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '26px', color: '#D4AF37', marginBottom: '4px' }}>Your Order</h2>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '24px' }}>Review items and enter your details</p>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '20px' }}>
            {cart.map((item, idx) => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: idx < cart.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{formatCurrency(item.price)} each</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => updateQty(item._id, -1)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>−</button>
                  <span style={{ color: '#D4AF37', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item._id, 1)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(212,175,55,0.2)', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: '14px' }}>+</button>
                </div>
                <div style={{ minWidth: '70px', textAlign: 'right', fontWeight: '700', color: '#D4AF37', fontSize: '13px' }}>{formatCurrency(item.price * item.qty)}</div>
              </div>
            ))}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
              <span style={{ color: '#aaa' }}>Total</span>
              <span style={{ color: '#D4AF37', fontSize: '18px' }}>{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px' }}>Order Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['dine-in', '🪑 Dine-In'], ['takeaway', '🥡 Takeaway']].map(([val, label]) => (
                <button key={val} onClick={() => setOrderType(val)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: orderType === val ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : 'rgba(255,255,255,0.07)', color: orderType === val ? '#0D0D0D' : '#aaa' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {orderType === 'dine-in' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '6px' }}>Table Number *</label>
              <input type="number" min="1" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                placeholder="e.g. 5"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '6px' }}>Your Name *</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Ahmed"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '6px' }}>Phone (optional)</label>
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="03XX-XXXXXXX" type="tel"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '6px' }}>Special Instructions</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Allergies, spice level, etc."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handlePlaceOrder} disabled={placing || cart.length === 0}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: placing ? 'rgba(212,175,55,0.4)' : 'linear-gradient(135deg, #D4AF37, #B8960C)', border: 'none', color: '#0D0D0D', fontWeight: '700', fontSize: '15px', cursor: placing ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
            {placing ? 'Placing Order...' : `✅ Place Order — ${formatCurrency(cartTotal)}`}
          </button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#666' }}>Payment will be collected at the table/counter.</p>
        </div>
      )}
    </div>
  );
}
