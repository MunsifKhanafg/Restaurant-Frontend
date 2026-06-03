import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../store/slices/orderSlice';
import { formatCurrency, formatDateTime, printBill } from '../utils/helpers';
import { useModal } from '../components/common/AppModal';
import { useRestaurant } from '../hooks/useRestaurant';

const STATUS_OPTIONS = ['received', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];

const PAYMENT_LABELS = {
  cash: '💵 Cash', card: '💳 Card', online: '🌐 Online',
  cod: '📦 COD', jazzcash: '📱 JazzCash', easypaisa: '💚 Easypaisa', bankaccount: '🏦 Bank Account',
};

/* ─── Date range helpers ─── */
const startOfDay   = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeek  = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; };
const startOfMonth = (d) => { const x = startOfDay(d); x.setDate(1); return x; };

const DATE_FILTERS = [
  { id: 'today',   label: '📅 Today' },
  { id: 'week',    label: '📆 This Week' },
  { id: 'month',   label: '🗓️ This Month' },
  { id: 'all',     label: '📚 All History' },
];

/* Format a date as "Monday, 3 June 2025" for group headers */
const formatGroupDate = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/* ────────────────────────────────────────────────────────────────────
   PRINT EXTRAS DIALOG
──────────────────────────────────────────────────────────────────── */
const DEFAULT_EXTRAS = [
  { id: 'bread', name: '🫓 Bread',        qty: 0, price: 80 },
  { id: 'raita', name: '🫙 Raita',        qty: 0, price: 60 },
  { id: 'water', name: '💧 Water Bottle', qty: 0, price: 50 },
  { id: 'keri',  name: '🥭 Keri (Mango)', qty: 0, price: 40 },
];

function PrintExtrasDialog({ order, onClose, restaurantName }) {
  const [extras, setExtras] = useState(
    DEFAULT_EXTRAS.map(e => ({
      ...e,
      qty:   e.id === 'bread' && order.breadIncluded ? (order.breadCount || 1) : 0,
      price: e.id === 'bread' && order.breadCharge
        ? Math.round(order.breadCharge / Math.max(order.breadCount || 1, 1))
        : e.price,
    }))
  );

  const setQty   = (id, v) => setExtras(p => p.map(e => e.id === id ? { ...e, qty:   Math.max(0, parseInt(v)      || 0) } : e));
  const setPrice = (id, v) => setExtras(p => p.map(e => e.id === id ? { ...e, price: Math.max(0, parseFloat(v)    || 0) } : e));

  const extrasTotal = extras.reduce((s, e) => s + e.qty * e.price, 0);
  const printOrder  = { ...order, breadIncluded: false, breadCharge: 0, _restaurantName: restaurantName };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:700,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div className="glass-card-elevated"
        style={{ width:'100%', maxWidth:'460px', maxHeight:'90vh', overflowY:'auto', padding:'28px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h2 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'22px', color:'var(--gold)', margin:0 }}>
            🖨️ Print Receipt
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:'22px', cursor:'pointer' }}>×</button>
        </div>
        <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'20px' }}>
          {order.billId} — Add any extras eaten before printing
        </p>

        <div style={{ fontSize:'11px', color:'var(--gold)', fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.1em', marginBottom:'10px' }}>Extras / Add-ons</div>

        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
          {extras.map(e => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px',
                                     borderRadius:'10px', transition:'all 0.2s',
                                     background: e.qty > 0 ? 'rgba(212,175,55,0.08)' : 'var(--bg-elevated)',
                                     border:`1px solid ${e.qty > 0 ? 'rgba(212,175,55,0.35)' : 'var(--border)'}` }}>
              <span style={{ fontSize:'14px', minWidth:'130px', fontWeight:600,
                             color: e.qty > 0 ? 'var(--gold)' : 'var(--text-secondary)' }}>{e.name}</span>
              <button onClick={() => setQty(e.id, e.qty - 1)}
                style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--border)',
                         background:'var(--bg-surface)', color:'var(--text-primary)', cursor:'pointer', fontSize:14 }}>−</button>
              <span style={{ minWidth:24, textAlign:'center', fontWeight:700, fontSize:15,
                             color: e.qty > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{e.qty}</span>
              <button onClick={() => setQty(e.id, e.qty + 1)}
                style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--border)',
                         background:'var(--bg-surface)', color:'var(--text-primary)', cursor:'pointer', fontSize:14 }}>+</button>
              <div style={{ display:'flex', alignItems:'center', gap:'4px', marginLeft:'auto' }}>
                <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>Rs.</span>
                <input type="number" min="0" value={e.price} onChange={ev => setPrice(e.id, ev.target.value)}
                  className="input-dark"
                  style={{ width:'60px', padding:'4px 6px', borderRadius:'6px', fontSize:'12px', textAlign:'right' }} />
              </div>
              {e.qty > 0 && (
                <span style={{ fontSize:'12px', color:'var(--gold)', fontWeight:700, minWidth:'70px', textAlign:'right' }}>
                  = Rs.{(e.qty * e.price).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding:'14px', borderRadius:'10px', background:'var(--bg-elevated)',
                      border:'1px solid var(--border)', marginBottom:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
            <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Order Total</span>
            <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{formatCurrency(order.totalAmount)}</span>
          </div>
          {extrasTotal > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
              <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Extras</span>
              <span style={{ fontSize:'13px', color:'var(--gold)' }}>+ {formatCurrency(extrasTotal)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'8px',
                        borderTop:'1px solid var(--border)', marginTop:'4px' }}>
            <span style={{ fontSize:'16px', fontWeight:700, color:'var(--text-primary)' }}>GRAND TOTAL</span>
            <span style={{ fontSize:'18px', fontWeight:700, color:'var(--gold)' }}>
              {formatCurrency(order.totalAmount + extrasTotal)}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button className="btn-outline-gold" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:'8px', fontSize:'13px' }}>Cancel</button>
          <button className="btn-gold" onClick={() => { printBill(printOrder, extras); onClose(); }}
            style={{ flex:2, padding:'12px', borderRadius:'8px', fontSize:'14px', fontWeight:700 }}>
            🖨️ Print & Give to Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const dispatch = useDispatch();
  const showModal = useModal();
  const { name: restaurantName } = useRestaurant();
  const { items: orders, loading } = useSelector((s) => s.orders);

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [search,       setSearch]       = useState('');
  const [dateFilter,   setDateFilter]   = useState('today');

  const [selectedOrder,    setSelectedOrder]    = useState(null);
  const [updatingId,       setUpdatingId]       = useState(null);
  const [payConfig,        setPayConfig]        = useState(null);
  const [payConfirmOrder,  setPayConfirmOrder]  = useState(null);
  const [printOrder,       setPrintOrder]       = useState(null);
  const [clearModal,       setClearModal]       = useState(false);
  const [clearYear,        setClearYear]        = useState(new Date().getFullYear());
  const [clearMonth,       setClearMonth]       = useState(new Date().getMonth() + 1);
  const [clearing,         setClearing]         = useState(false);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => setPayConfig(d?.data || null)).catch(() => {});
  }, []);

  // Fetch orders — load enough history based on selected filter
  useEffect(() => {
    const limitMap = { today: 200, week: 500, month: 1000, all: 500 };
    dispatch(fetchOrders({ limit: limitMap[dateFilter] || 200 }));
  }, [dispatch, dateFilter]);

  /* ── Date-range filtering ── */
  const dateRangeFiltered = useMemo(() => {
    if (dateFilter === 'all') return orders;
    const now = new Date();
    const from =
      dateFilter === 'today' ? startOfDay(now)   :
      dateFilter === 'week'  ? startOfWeek(now)  :
      dateFilter === 'month' ? startOfMonth(now) : null;
    if (!from) return orders;
    return orders.filter(o => new Date(o.createdAt) >= from);
  }, [orders, dateFilter]);

  /* ── Search / status / type filtering ── */
  const filtered = useMemo(() => {
    return dateRangeFiltered.filter(o => {
      const matchStatus = statusFilter ? o.orderStatus === statusFilter : true;
      const matchType   = typeFilter   ? o.orderType   === typeFilter   : true;
      const matchSearch = search
        ? (o.billId?.toLowerCase().includes(search.toLowerCase()) ||
           o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
           String(o.tableNumber).includes(search))
        : true;
      return matchStatus && matchType && matchSearch;
    });
  }, [dateRangeFiltered, statusFilter, typeFilter, search]);

  /* ── Group filtered orders by date ── */
  const groupedOrders = useMemo(() => {
    const groups = {};
    filtered.forEach(order => {
      const key = new Date(order.createdAt).toDateString();
      if (!groups[key]) groups[key] = { dateKey: key, dateMs: new Date(order.createdAt).setHours(0,0,0,0), orders: [] };
      groups[key].orders.push(order);
    });
    return Object.values(groups).sort((a, b) => b.dateMs - a.dateMs);
  }, [filtered]);

  /* ── Daily summary ── */
  const dailySummary = (dayOrders) => {
    const total    = dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const completed = dayOrders.filter(o => ['completed','delivered'].includes(o.orderStatus)).length;
    return { total, completed, count: dayOrders.length };
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    const res = await dispatch(updateOrderStatus({ id, status }));
    setUpdatingId(null);
    if (updateOrderStatus.fulfilled.match(res)) {
      showModal('success', 'Status Updated', `Order status changed to "${status}" successfully.`);
      if (selectedOrder && selectedOrder._id === id) {
        setSelectedOrder(prev => ({ ...prev, orderStatus: status }));
      }
    } else {
      showModal('error', 'Update Failed', 'Could not update order status. Please try again.');
    }
  };

  const handlePrintOrder = (order) => setPrintOrder(order);

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  const handleClearMonth = async () => {
    setClearing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders/clear-month', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ year: clearYear, month: clearMonth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showModal('success', '🗑️ History Cleared',
        `${data.message}. Refreshing order list...`);
      setClearModal(false);
      dispatch(fetchOrders({ limit: 500 }));
    } catch (err) {
      showModal('error', 'Clear Failed', err.message || 'Could not clear order history.');
    }
    setClearing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Print Extras Dialog */}
      {printOrder && (
        <PrintExtrasDialog order={printOrder} restaurantName={restaurantName} onClose={() => setPrintOrder(null)} />
      )}

      {/* ── Clear Month History Modal ── */}
      {clearModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', zIndex:700,
                      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card-elevated"
            style={{ width:'100%', maxWidth:'400px', padding:'28px', borderRadius:'16px' }}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'8px' }}>🗑️</div>
              <h2 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'22px',
                           color:'var(--gold)', margin:'0 0 6px' }}>Clear Monthly History</h2>
              <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:0 }}>
                Permanently deletes all orders for the selected month.
              </p>
            </div>

            {/* Month + Year selectors */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'var(--gold)',
                                fontWeight:700, textTransform:'uppercase',
                                letterSpacing:'0.1em', marginBottom:'6px' }}>Month</label>
                <select className="select-dark" value={clearMonth}
                  onChange={e => setClearMonth(Number(e.target.value))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', fontSize:'13px' }}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'var(--gold)',
                                fontWeight:700, textTransform:'uppercase',
                                letterSpacing:'0.1em', marginBottom:'6px' }}>Year</label>
                <select className="select-dark" value={clearYear}
                  onChange={e => setClearYear(Number(e.target.value))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', fontSize:'13px' }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Warning */}
            <div style={{ padding:'12px 14px', borderRadius:'8px', marginBottom:'20px',
                          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize:'12px', color:'#EF4444', lineHeight:1.6 }}>
                ⚠️ <strong>This action is permanent.</strong> All orders from 
                <strong>{MONTH_NAMES[clearMonth-1]} {clearYear}</strong> will be deleted
                from the database and cannot be recovered.
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button className="btn-outline-gold" onClick={() => setClearModal(false)}
                style={{ flex:1, padding:'11px', borderRadius:'8px', fontSize:'13px' }}>
                Cancel
              </button>
              <button onClick={handleClearMonth} disabled={clearing}
                style={{ flex:2, padding:'11px', borderRadius:'8px', fontSize:'13px',
                         fontWeight:700, cursor:'pointer',
                         background: clearing ? 'rgba(239,68,68,0.4)' : '#EF4444',
                         border:'none', color:'#fff', opacity: clearing ? 0.7 : 1 }}>
                {clearing ? 'Deleting...' : `🗑️ Delete ${MONTH_NAMES[clearMonth-1]} ${clearYear}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {payConfirmOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '420px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>💳</div>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '4px' }}>Payment Account Details</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order {payConfirmOrder.billId}</p>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', padding: '6px 16px', borderRadius: '999px',
                background: payConfirmOrder.paymentMethod === 'jazzcash' ? 'rgba(255,107,53,0.15)' : payConfirmOrder.paymentMethod === 'easypaisa' ? 'rgba(0,150,57,0.15)' : 'rgba(212,175,55,0.15)',
                color: payConfirmOrder.paymentMethod === 'jazzcash' ? '#FF6B35' : payConfirmOrder.paymentMethod === 'easypaisa' ? '#009639' : 'var(--gold)',
                border: `1px solid ${payConfirmOrder.paymentMethod === 'jazzcash' ? 'rgba(255,107,53,0.4)' : payConfirmOrder.paymentMethod === 'easypaisa' ? 'rgba(0,150,57,0.4)' : 'rgba(212,175,55,0.3)'}`
              }}>{PAYMENT_LABELS[payConfirmOrder.paymentMethod] || payConfirmOrder.paymentMethod}</span>
            </div>
            {payConfig && ['jazzcash','easypaisa','bankaccount'].includes(payConfirmOrder.paymentMethod) ? (
              <div style={{ padding: '16px', borderRadius: '10px', marginBottom: '16px',
                background: payConfirmOrder.paymentMethod === 'jazzcash' ? 'rgba(255,60,0,0.08)' : payConfirmOrder.paymentMethod === 'easypaisa' ? 'rgba(0,150,57,0.08)' : 'rgba(212,175,55,0.08)',
                border: `1px solid ${payConfirmOrder.paymentMethod === 'jazzcash' ? 'rgba(255,107,53,0.4)' : payConfirmOrder.paymentMethod === 'easypaisa' ? 'rgba(0,150,57,0.4)' : 'rgba(212,175,55,0.3)'}`
              }}>
                {payConfirmOrder.paymentMethod === 'jazzcash' && (<>
                  <div style={{ fontSize: '11px', color: '#FF6B35', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>📱 JazzCash Account</div>
                  {payConfig.jazzcash?.number ? <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{payConfig.jazzcash.number}</div> : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not configured</div>}
                  {payConfig.jazzcash?.accountName && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Account: {payConfig.jazzcash.accountName}</div>}
                </>)}
                {payConfirmOrder.paymentMethod === 'easypaisa' && (<>
                  <div style={{ fontSize: '11px', color: '#009639', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>💚 Easypaisa Account</div>
                  {payConfig.easypaisa?.number ? <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{payConfig.easypaisa.number}</div> : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not configured</div>}
                  {payConfig.easypaisa?.accountName && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Account: {payConfig.easypaisa.accountName}</div>}
                </>)}
                {payConfirmOrder.paymentMethod === 'bankaccount' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>🏦 Bank Account</div>
                    {payConfig.bankaccount?.accountTitle  && <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Name: <b>{payConfig.bankaccount.accountTitle}</b></div>}
                    {payConfig.bankaccount?.bankName      && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bank: {payConfig.bankaccount.bankName}</div>}
                    {payConfig.bankaccount?.accountNumber && <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: '"JetBrains Mono",monospace' }}>{payConfig.bankaccount.accountNumber}</div>}
                    {payConfig.bankaccount?.iban          && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono",monospace' }}>IBAN: {payConfig.bankaccount.iban}</div>}
                  </div>
                )}
                {payConfig.whatsapp && (
                  <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#25D366', fontWeight: '700' }}>📸 Send screenshot to WhatsApp</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>{payConfig.whatsapp}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                💵 Cash payment — no account details needed.
              </div>
            )}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Order Total</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold)' }}>{formatCurrency(payConfirmOrder.totalAmount)}</span>
            </div>
            <button className="btn-gold" onClick={() => setPayConfirmOrder(null)} style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}>✅ Got It</button>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: isMobile ? '22px' : '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Orders</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} orders • grouped by day</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-outline-gold" onClick={() => dispatch(fetchOrders({ limit: 500 }))} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
            🔄 Refresh
          </button>
          <button
            onClick={() => setClearModal(true)}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                     fontWeight: 600, cursor: 'pointer',
                     border: '1px solid rgba(239,68,68,0.45)',
                     background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* ── Date Filter Tabs ── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setDateFilter(f.id)}
            style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
              background: dateFilter === f.id ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
              borderColor: dateFilter === f.id ? 'transparent' : 'var(--border)',
              color: dateFilter === f.id ? '#0D0D0D' : 'var(--text-secondary)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input className="input-dark" placeholder="Search bill ID, customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', flex: 1, minWidth: '140px' }} />
        <select className="select-dark" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
        <select className="select-dark" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}>
          <option value="">All Types</option>
          <option value="dine-in">Dine In</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>

      {/* ── Orders grouped by day ── */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading orders...</div>
      ) : groupedOrders.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders found for this period</p>
        </div>
      ) : groupedOrders.map(group => {
        const { total, completed, count } = dailySummary(group.orders);
        return (
          <div key={group.dateKey}>
            {/* ── Day Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: '10px',
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '14px' }}>
                  {formatGroupDate(group.dateKey)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                  {count} order{count !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ✅ {completed} completed
                </span>
                <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '14px' }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* ── Orders Table / Card List ── */}
            <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ overflowX: 'auto' }}>
                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                    {group.orders.map(order => (
                      <div key={order._id} onClick={() => setSelectedOrder(order)}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '10px', padding: '12px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: 'var(--gold)', fontWeight: '700' }}>{order.billId}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateTime(order.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {order.orderType === 'dine-in' ? '🪑' : order.orderType === 'delivery' ? '🛵' : '🥡'} {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : order.customer?.name || order.orderType}
                          </span>
                          <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '14px' }}>{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                          <select value={order.orderStatus} disabled={updatingId === order._id}
                            onChange={e => handleStatusChange(order._id, e.target.value)}
                            className="select-dark"
                            style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => handlePrintOrder(order)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Print">🖨️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Bill ID</th>
                        <th>Type</th>
                        <th>Table / Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.orders.map(order => (
                        <tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                          <td>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: 'var(--gold)' }}>{order.billId}</span>
                          </td>
                          <td>
                            <span style={{ textTransform: 'capitalize', fontSize: '12px' }}>
                              {order.orderType === 'dine-in' ? '🪑' : order.orderType === 'delivery' ? '🛵' : '🥡'} {order.orderType}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : order.customer?.name || '—'}
                            </span>
                          </td>
                          <td><span style={{ fontSize: '12px' }}>{order.items?.length} item(s)</span></td>
                          <td><span style={{ fontWeight: '600', color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span></td>
                          <td>
                            <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                            </span>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <select value={order.orderStatus} disabled={updatingId === order._id}
                              onChange={e => handleStatusChange(order._id, e.target.value)}
                              className="select-dark"
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateTime(order.createdAt)}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button onClick={() => setSelectedOrder(order)} className="btn-outline-gold" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>View</button>
                              {['jazzcash','easypaisa','bankaccount'].includes(order.paymentMethod) && (
                                <button onClick={e => { e.stopPropagation(); setPayConfirmOrder(order); }}
                                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', cursor: 'pointer' }} title="View payment account">
                                  💳
                                </button>
                              )}
                              <button onClick={() => handlePrintOrder(order)} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Print receipt">
                                🖨️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setSelectedOrder(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '2px' }}>
                  {selectedOrder.billId}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                ['Type', selectedOrder.orderType],
                ['Table', selectedOrder.tableNumber || '—'],
                ['Status', selectedOrder.orderStatus],
                ['Payment', PAYMENT_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod],
                ['Waiter', selectedOrder.waiter?.name || '—'],
                ['Customer', selectedOrder.customer?.name || '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{val}</div>
                </div>
              ))}
            </div>

            {selectedOrder.paymentDetails && (selectedOrder.paymentDetails.referenceNumber || selectedOrder.paymentDetails.senderName) && (
              <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.3)' }}>
                <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px' }}>💳 Payment Reference</div>
                {selectedOrder.paymentDetails.referenceNumber && (
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Ref#: </span>
                    <span style={{ fontFamily: '"JetBrains Mono",monospace', fontWeight: '700' }}>{selectedOrder.paymentDetails.referenceNumber}</span>
                  </div>
                )}
                {selectedOrder.paymentDetails.senderName && (
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Sender: </span>
                    {selectedOrder.paymentDetails.senderName}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px' }}>Update Status</div>
              <select value={selectedOrder.orderStatus} disabled={updatingId === selectedOrder._id}
                onChange={e => handleStatusChange(selectedOrder._id, e.target.value)}
                className="select-dark"
                style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>Order Items</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name} × {item.quantity}</div>
                      {item.specialInstructions && <div style={{ fontSize: '10px', color: 'var(--orange)' }}>📝 {item.specialInstructions}</div>}
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '13px' }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                {selectedOrder.breadIncluded && selectedOrder.breadCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gold)' }}>🫓 Bread Basket</div>
                    <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '13px' }}>{formatCurrency(selectedOrder.breadCharge)}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              {[
                ['Subtotal', formatCurrency(selectedOrder.subtotal)],
                [`Tax (${selectedOrder.taxPercentage}%)`, formatCurrency(selectedOrder.taxAmount)],
                selectedOrder.discountAmount > 0 ? ['Discount', `- ${formatCurrency(selectedOrder.discountAmount)}`] : null,
                selectedOrder.deliveryCharge > 0 ? ['Delivery Charge', formatCurrency(selectedOrder.deliveryCharge)] : null,
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>TOTAL</span>
                <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '15px' }}>{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={() => setSelectedOrder(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Close</button>
              <button className="btn-gold" onClick={() => handlePrintOrder(selectedOrder)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
