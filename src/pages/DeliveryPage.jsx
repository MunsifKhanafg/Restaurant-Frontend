import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../store/slices/orderSlice';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const DELIVERY_ZONES = ['Zone A — City Centre', 'Zone B — North', 'Zone C — South', 'Zone D — East', 'Zone E — West', 'Zone F — Suburbs'];

export default function DeliveryPage() {
  const dispatch = useDispatch();
  const { items: orders, loading } = useSelector((s) => s.orders);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    dispatch(fetchOrders({ type: 'delivery', limit: 100 }));
    const interval = setInterval(() => dispatch(fetchOrders({ type: 'delivery', limit: 100 })), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const deliveryOrders = orders.filter(o => o.orderType === 'delivery');

  const activeOrders = deliveryOrders.filter(o => !['completed', 'delivered', 'cancelled'].includes(o.orderStatus));
  const completedOrders = deliveryOrders.filter(o => ['completed', 'delivered'].includes(o.orderStatus));

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    const res = await dispatch(updateOrderStatus({ id, status }));
    setUpdatingId(null);
    if (updateOrderStatus.fulfilled.match(res)) toast.success('Delivery status updated');
    else toast.error('Update failed');
  };

  const getStatusBadge = (status) => {
    const map = {
      received: { color: '#4A9ECA', bg: 'rgba(74,158,202,0.15)', border: 'rgba(74,158,202,0.3)' },
      confirmed: { color: '#D4AF37', bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.3)' },
      preparing: { color: '#E07B39', bg: 'rgba(224,123,57,0.15)', border: 'rgba(224,123,57,0.3)' },
      ready: { color: '#4CAF7D', bg: 'rgba(76,175,125,0.15)', border: 'rgba(76,175,125,0.3)' },
      delivered: { color: '#4CAF7D', bg: 'rgba(76,175,125,0.15)', border: 'rgba(76,175,125,0.3)' },
      completed: { color: '#4CAF7D', bg: 'rgba(76,175,125,0.15)', border: 'rgba(76,175,125,0.3)' },
      cancelled: { color: '#E05252', bg: 'rgba(224,82,82,0.15)', border: 'rgba(224,82,82,0.3)' },
    };
    return map[status] || map.received;
  };

  const DeliveryCard = ({ order }) => {
    const badge = getStatusBadge(order.orderStatus);
    const isActive = !['completed', 'delivered', 'cancelled'].includes(order.orderStatus);
    return (
      <div className="glass-card" style={{ overflow: 'hidden', opacity: isActive ? 1 : 0.7, borderColor: badge.border }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: badge.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: '700', color: badge.color }}>{order.billId}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDateTime(order.createdAt)}</div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            {order.orderStatus}
          </span>
        </div>

        {/* Customer Info */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                {order.customer?.name || 'Unknown Customer'}
              </div>
              {order.customer?.address && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  📍 {order.customer.address}
                </div>
              )}
              {order.customer?.deliveryZone && (
                <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '2px' }}>
                  🗺️ {order.customer.deliveryZone}
                </div>
              )}
            </div>
            {/* Call button */}
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)', textDecoration: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: '18px' }}>📞</span>
                <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '600' }}>Call</span>
              </a>
            )}
          </div>
          {order.customer?.phone && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📱 {order.customer.phone}</div>
          )}
        </div>

        {/* Items summary */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {order.items?.length} item(s):
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
          </div>
        </div>

        {/* Total + Payment */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Total</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gold)' }}>{formatCurrency(order.totalAmount)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Payment</div>
            <span className={`badge ${order.paymentMethod === 'cod' || order.paymentMethod === 'cash' ? 'badge-orange' : 'badge-green'}`}>
              {order.paymentMethod === 'cod' || order.paymentMethod === 'cash' ? '💵 COD' : '💳 Online'}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
            {order.orderStatus === 'ready' && (
              <button onClick={() => handleStatus(order._id, 'delivered')}
                disabled={updatingId === order._id}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#fff', opacity: updatingId === order._id ? 0.6 : 1 }}>
                🛵 Mark Delivered
              </button>
            )}
            {order.orderStatus === 'delivered' && (
              <button onClick={() => handleStatus(order._id, 'completed')}
                disabled={updatingId === order._id}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: 'var(--gold)', color: '#0D0D0D', opacity: updatingId === order._id ? 0.6 : 1 }}>
                ✅ Complete Order
              </button>
            )}
            {!['ready', 'delivered'].includes(order.orderStatus) && (
              <div style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
                Waiting for kitchen...
              </div>
            )}
            <button onClick={() => handleStatus(order._id, 'cancelled')}
              disabled={updatingId === order._id}
              style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.1)', color: 'var(--red)', opacity: updatingId === order._id ? 0.6 : 1 }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Delivery Management
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {activeOrders.length} active · {completedOrders.length} completed today
          </p>
        </div>
        <button className="btn-outline-gold" onClick={() => dispatch(fetchOrders({ type: 'delivery', limit: 100 }))} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'Active Deliveries', val: activeOrders.length, color: 'var(--orange)', icon: '🛵' },
          { label: 'Delivered Today', val: completedOrders.length, color: 'var(--green)', icon: '✅' },
          { label: 'Total Delivery', val: deliveryOrders.length, color: 'var(--gold)', icon: '📦' },
          { label: 'COD Pending', val: activeOrders.filter(o => o.paymentMethod === 'cash' || o.paymentMethod === 'cod').length, color: 'var(--blue)', icon: '💵' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{label}</span>
              <span style={{ fontSize: '18px' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontFamily: '"Cormorant Garamond", serif', fontWeight: '600', color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Active Orders */}
      {loading && deliveryOrders.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛵</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active delivery orders</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', color: 'var(--text-primary)' }}>Active Orders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
            {activeOrders.map(order => <DeliveryCard key={order._id} order={order} />)}
          </div>
        </>
      )}

      {/* Completed */}
      {completedOrders.length > 0 && (
        <>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', color: 'var(--text-muted)', marginTop: '8px' }}>Completed Today</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
            {completedOrders.slice(0, 8).map(order => <DeliveryCard key={order._id} order={order} />)}
          </div>
        </>
      )}
    </div>
  );
}
