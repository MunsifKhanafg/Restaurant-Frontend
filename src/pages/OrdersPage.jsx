import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../store/slices/orderSlice';
import { formatCurrency, formatDateTime, getStatusColor, printBill } from '../utils/helpers';
import { useModal } from '../components/common/AppModal';

const STATUS_OPTIONS = ['received', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];

const PAYMENT_LABELS = {
  cash: '💵 Cash', card: '💳 Card', online: '🌐 Online',
  cod: '📦 COD', jazzcash: '📱 JazzCash', easypaisa: '💚 Easypaisa', bankaccount: '🏦 Bank Account',
};

export default function OrdersPage() {
  const dispatch = useDispatch();
  const showModal = useModal();
  const { items: orders, loading } = useSelector((s) => s.orders);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [payConfig, setPayConfig] = useState(null);
  const [payConfirmOrder, setPayConfirmOrder] = useState(null);

  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => setPayConfig(d?.data || null)).catch(() => {});
  }, []);

  useEffect(() => {
    dispatch(fetchOrders({ limit: 100 }));
  }, [dispatch]);

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter ? o.orderStatus === statusFilter : true;
    const matchType = typeFilter ? o.orderType === typeFilter : true;
    const matchSearch = search
      ? (o.billId?.toLowerCase().includes(search.toLowerCase()) ||
         o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
         String(o.tableNumber).includes(search))
      : true;
    return matchStatus && matchType && matchSearch;
  });

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

  // Build a printable order object from selectedOrder
  const handlePrintOrder = (order) => {
    const printableOrder = {
      ...order,
      billId: order.billId,
      createdAt: order.createdAt,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      customer: order.customer,
      items: order.items || [],
      subtotal: order.subtotal,
      taxPercentage: order.taxPercentage,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount || 0,
      deliveryCharge: order.deliveryCharge || 0,
      breadIncluded: order.breadIncluded || false,
      breadCharge: order.breadCharge || 0,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
    };
    printBill(printableOrder);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                {payConfirmOrder.paymentMethod === 'jazzcash' && (
                  <>
                    <div style={{ fontSize: '11px', color: '#FF6B35', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>📱 JazzCash Account</div>
                    {payConfig.jazzcash?.number ? <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{payConfig.jazzcash.number}</div> : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not configured</div>}
                    {payConfig.jazzcash?.accountName && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Account: {payConfig.jazzcash.accountName}</div>}
                  </>
                )}
                {payConfirmOrder.paymentMethod === 'easypaisa' && (
                  <>
                    <div style={{ fontSize: '11px', color: '#009639', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>💚 Easypaisa Account</div>
                    {payConfig.easypaisa?.number ? <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{payConfig.easypaisa.number}</div> : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not configured</div>}
                    {payConfig.easypaisa?.accountName && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Account: {payConfig.easypaisa.accountName}</div>}
                  </>
                )}
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Orders</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} orders found</p>
        </div>
        <button className="btn-outline-gold" onClick={() => dispatch(fetchOrders({ limit: 100 }))} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input className="input-dark" placeholder="Search by Bill ID, customer, table..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', flex: 1, minWidth: '200px' }} />
        <select className="select-dark" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
        <select className="select-dark" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">All Types</option>
          <option value="dine-in">Dine In</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading orders...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders found</p>
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
                {filtered.map(order => (
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
                    <td>
                      <span style={{ fontSize: '12px' }}>{order.items?.length} item(s)</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</span>
                    </td>
                    <td>
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                        {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        value={order.orderStatus}
                        disabled={updatingId === order._id}
                        onChange={e => handleStatusChange(order._id, e.target.value)}
                        className="select-dark"
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateTime(order.createdAt)}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setSelectedOrder(order)} className="btn-outline-gold" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>
                          View
                        </button>
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setSelectedOrder(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '2px' }}>
                  {selectedOrder.billId}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px' }}>×</button>
            </div>

            {/* Meta */}
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

            {/* Payment Details (for digital payments) */}
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

            {/* Status Update */}
            <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px' }}>Update Status</div>
              <select
                value={selectedOrder.orderStatus}
                disabled={updatingId === selectedOrder._id}
                onChange={e => handleStatusChange(selectedOrder._id, e.target.value)}
                className="select-dark"
                style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>

            {/* Items */}
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
                {/* Bread if included */}
                {selectedOrder.breadIncluded && selectedOrder.breadCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gold)' }}>🫓 Bread Basket</div>
                    <span style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '13px' }}>{formatCurrency(selectedOrder.breadCharge)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals */}
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

            {/* Action Buttons */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn-outline-gold" onClick={() => setSelectedOrder(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                Close
              </button>
              <button
                className="btn-gold"
                onClick={() => handlePrintOrder(selectedOrder)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
