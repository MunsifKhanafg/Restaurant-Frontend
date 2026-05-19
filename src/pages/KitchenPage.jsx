import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchKitchenOrders, updateOrderStatus } from '../store/slices/orderSlice';
import { formatTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_FLOW = {
  received:  { next: 'confirmed',  label: 'Confirm',  color: 'var(--blue)' },
  confirmed: { next: 'preparing',  label: 'Start Cooking', color: 'var(--orange)' },
  preparing: { next: 'ready',      label: 'Mark Ready', color: 'var(--green)' },
  ready:     { next: 'completed',  label: 'Complete',  color: 'var(--gold)' },
};

const STATUS_BADGE = {
  received:  { bg: 'rgba(74,158,202,0.15)',  color: '#4A9ECA', border: 'rgba(74,158,202,0.3)' },
  confirmed: { bg: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: 'rgba(212,175,55,0.3)' },
  preparing: { bg: 'rgba(224,123,57,0.15)', color: '#E07B39', border: 'rgba(224,123,57,0.3)' },
  ready:     { bg: 'rgba(76,175,125,0.15)', color: '#4CAF7D', border: 'rgba(76,175,125,0.3)' },
};

function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setElapsed(diff);
    };
    calc();
    const interval = setInterval(calc, 10000);
    return () => clearInterval(interval);
  }, [createdAt]);
  const mins = Math.floor(elapsed / 60);
  const isLate = mins >= 20;
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: '"JetBrains Mono", monospace', color: isLate ? 'var(--red)' : 'var(--text-muted)', background: isLate ? 'rgba(224,82,82,0.1)' : 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${isLate ? 'rgba(224,82,82,0.3)' : 'var(--border)'}` }}>
      ⏱ {mins}m {elapsed % 60}s
    </span>
  );
}

export default function KitchenPage() {
  const dispatch = useDispatch();
  const { kitchenOrders, loading } = useSelector((s) => s.orders);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    dispatch(fetchKitchenOrders());
    const interval = setInterval(() => dispatch(fetchKitchenOrders()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const filtered = filter === 'all' ? kitchenOrders : kitchenOrders.filter(o => o.orderStatus === filter);

  const handleAdvance = async (order) => {
    const step = STATUS_FLOW[order.orderStatus];
    if (!step) return;
    setUpdating(order._id);
    const res = await dispatch(updateOrderStatus({ id: order._id, status: step.next }));
    setUpdating(null);
    if (updateOrderStatus.fulfilled.match(res)) {
      toast.success(`Order ${order.billId} → ${step.next}`);
    } else toast.error('Update failed');
  };

  const counts = {
    all: kitchenOrders.length,
    received: kitchenOrders.filter(o => o.orderStatus === 'received').length,
    confirmed: kitchenOrders.filter(o => o.orderStatus === 'confirmed').length,
    preparing: kitchenOrders.filter(o => o.orderStatus === 'preparing').length,
    ready: kitchenOrders.filter(o => o.orderStatus === 'ready').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Kitchen Display System
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Live order queue — auto-refreshes every 30s
          </p>
        </div>
        <button className="btn-outline-gold" onClick={() => dispatch(fetchKitchenOrders())} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all', 'received', 'confirmed', 'preparing', 'ready'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{
              padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', textTransform: 'capitalize',
              background: filter === tab ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
              borderColor: filter === tab ? 'transparent' : 'var(--border)',
              color: filter === tab ? '#0D0D0D' : 'var(--text-secondary)',
            }}>
            {tab === 'all' ? 'All' : tab} {counts[tab] > 0 && <span style={{ marginLeft: '4px', background: filter === tab ? 'rgba(0,0,0,0.2)' : 'rgba(212,175,55,0.15)', padding: '0 5px', borderRadius: '999px', color: filter === tab ? '#0D0D0D' : 'var(--gold)' }}>{counts[tab]}</span>}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading && kitchenOrders.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '12px' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍🍳</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {filter === 'all' ? 'No active orders in kitchen' : `No ${filter} orders`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {filtered.map(order => {
            const badge = STATUS_BADGE[order.orderStatus] || STATUS_BADGE.received;
            const step = STATUS_FLOW[order.orderStatus];
            return (
              <div key={order._id} className="glass-card" style={{ overflow: 'hidden', borderColor: badge.border, transition: 'border-color 0.3s' }}>
                {/* Order header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${badge.bg}` }}>
                  <div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', fontWeight: '700', color: badge.color }}>{order.billId}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {order.orderType === 'dine-in' ? `🪑 Table ${order.tableNumber}` : order.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {order.orderStatus}
                    </span>
                    <ElapsedTimer createdAt={order.createdAt} />
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</div>
                        {item.specialInstructions && (
                          <div style={{ fontSize: '10px', color: 'var(--orange)', marginTop: '1px' }}>📝 {item.specialInstructions}</div>
                        )}
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)', padding: '2px 10px', borderRadius: '6px' }}>
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--orange)', borderTop: '1px solid var(--border)' }}>
                    📝 {order.notes}
                  </div>
                )}

                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                  {step && (
                    <button
                      onClick={() => handleAdvance(order)}
                      disabled={updating === order._id}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: step.color, color: step.color === 'var(--gold)' ? '#0D0D0D' : '#fff',
                        opacity: updating === order._id ? 0.6 : 1,
                      }}>
                      {updating === order._id ? '...' : step.label}
                    </button>
                  )}
                  {order.orderStatus === 'ready' && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)', color: '#4CAF7D', fontSize: '12px', fontWeight: '600' }}>
                      ✅ Ready to Serve!
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
