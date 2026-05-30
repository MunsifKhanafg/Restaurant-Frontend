import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../store/slices/orderSlice';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DeliveryPage() {
  const dispatch = useDispatch();
  const { items: orders, loading } = useSelector((s) => s.orders);
  const [updatingId, setUpdatingId] = useState(null);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Poll every 20 s so driver sees kitchen status updates in real time
  useEffect(() => {
    dispatch(fetchOrders({ type: 'delivery', limit: 100 }));
    const interval = setInterval(
      () => dispatch(fetchOrders({ type: 'delivery', limit: 100 })),
      20000,
    );
    return () => clearInterval(interval);
  }, [dispatch]);

  const deliveryOrders   = orders.filter(o => o.orderType === 'delivery');
  const activeOrders     = deliveryOrders.filter(o => !['completed','delivered','cancelled'].includes(o.orderStatus));
  const completedOrders  = deliveryOrders.filter(o => ['completed','delivered'].includes(o.orderStatus));

  /* ── Status update helper ── */
  const handleStatus = async (id, status, successMsg) => {
    setUpdatingId(id);
    const res = await dispatch(updateOrderStatus({ id, status }));
    setUpdatingId(null);
    if (updateOrderStatus.fulfilled.match(res)) {
      toast.success(successMsg || 'Status updated');
      // Immediately refresh so admin sees the change
      dispatch(fetchOrders({ type: 'delivery', limit: 100 }));
    } else {
      toast.error('Update failed — please try again');
    }
  };

  /* ── Status badge colours ── */
  const getBadge = (status) => {
    const map = {
      received:  { color: '#4A9ECA', bg: 'rgba(74,158,202,0.15)',   border: 'rgba(74,158,202,0.3)'   },
      confirmed: { color: '#D4AF37', bg: 'rgba(212,175,55,0.15)',   border: 'rgba(212,175,55,0.3)'   },
      preparing: { color: '#E07B39', bg: 'rgba(224,123,57,0.15)',   border: 'rgba(224,123,57,0.3)'   },
      ready:     { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',    border: 'rgba(34,197,94,0.3)'    },
      delivered: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',   border: 'rgba(59,130,246,0.3)'   },
      completed: { color: '#10B981', bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.3)'   },
      cancelled: { color: '#E05252', bg: 'rgba(224,82,82,0.15)',    border: 'rgba(224,82,82,0.3)'    },
    };
    return map[status] || map.received;
  };

  /* ── Per-order driver flow labels ── */
  const driverStepLabel = (status) => {
    const map = {
      received:  { icon: '📩', text: 'Order received — kitchen not yet confirmed' },
      confirmed: { icon: '✅', text: 'Order confirmed — kitchen is preparing' },
      preparing: { icon: '👨‍🍳', text: 'Kitchen is preparing the order…' },
      ready:     { icon: '🔔', text: 'Order is ready — go pick it up!' },
      delivered: { icon: '🛵', text: 'You have the order — heading to customer' },
      completed: { icon: '✅', text: 'Delivered successfully' },
      cancelled: { icon: '❌', text: 'Order cancelled' },
    };
    return map[status] || { icon: '📦', text: status };
  };

  /* ─────────────────────────────────────────────
     DELIVERY CARD
  ───────────────────────────────────────────── */
  const DeliveryCard = ({ order }) => {
    const badge    = getBadge(order.orderStatus);
    const isActive = !['completed','delivered','cancelled'].includes(order.orderStatus);
    const step     = driverStepLabel(order.orderStatus);

    return (
      <div className="glass-card" style={{
        overflow: 'hidden',
        opacity: !isActive && order.orderStatus !== 'delivered' ? 0.75 : 1,
        border: `1.5px solid ${badge.border}`,
        borderRadius: '14px',
      }}>

        {/* ── Card header: bill ID + status ── */}
        <div style={{
          padding: isMobile ? '12px 14px' : '14px 16px',
          borderBottom: '1px solid var(--border)',
          background: badge.bg,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: '8px',
        }}>
          <div>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '13px',
                          fontWeight: 700, color: badge.color }}>
              {order.billId}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {formatDateTime(order.createdAt)}
            </div>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            padding: '4px 12px', borderRadius: '999px',
            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            whiteSpace: 'nowrap',
          }}>
            {order.orderStatus}
          </span>
        </div>

        {/* ── Customer info ── */}
        <div style={{ padding: isMobile ? '12px 14px' : '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: isMobile ? '16px' : '15px' }}>
                {order.customer?.name || 'Unknown Customer'}
              </div>
              {order.customer?.phone && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📱 {order.customer.phone}
                </div>
              )}
              {order.customer?.address && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  📍 {order.customer.address}
                </div>
              )}
              {order.customer?.deliveryZone && (
                <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '3px', fontWeight: 600 }}>
                  🗺️ {order.customer.deliveryZone}
                </div>
              )}
            </div>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                         padding: isMobile ? '12px 16px' : '10px 14px', borderRadius: '10px',
                         background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                         textDecoration: 'none', flexShrink: 0 }}>
                <span style={{ fontSize: '22px' }}>📞</span>
                <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 700 }}>Call</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Items ── */}
        <div style={{ padding: isMobile ? '10px 14px' : '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                        fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>
            Items ({order.items?.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                    fontSize: isMobile ? '14px' : '13px', color: 'var(--text-secondary)' }}>
                <span>{item.name} <span style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span></span>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Total + Payment ── */}
        <div style={{
          padding: isMobile ? '10px 14px' : '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>Total</div>
            <div style={{ fontSize: isMobile ? '22px' : '20px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatCurrency(order.totalAmount)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Payment</div>
            <span className={`badge ${
              order.paymentMethod === 'cod' || order.paymentMethod === 'cash'
                ? 'badge-orange' : 'badge-green'
            }`} style={{ fontSize: isMobile ? '12px' : '11px' }}>
              {order.paymentMethod === 'cod' || order.paymentMethod === 'cash' ? '💵 Cash on Delivery' : '💳 Paid Online'}
            </span>
          </div>
        </div>

        {/* ── DRIVER FLOW ACTIONS ── */}
        <div style={{ padding: isMobile ? '14px' : '12px 16px' }}>

          {/* Current step indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 14px', borderRadius: '10px', marginBottom: '12px',
            background: badge.bg, border: `1px solid ${badge.border}`,
          }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>{step.icon}</span>
            <span style={{ fontSize: isMobile ? '14px' : '13px', color: badge.color, fontWeight: 600, lineHeight: 1.4 }}>
              {step.text}
            </span>
          </div>

          {/* ── Step 1: Kitchen preparing — driver waits ── */}
          {['received','confirmed','preparing'].includes(order.orderStatus) && (
            <div style={{
              padding: '14px', borderRadius: '10px', textAlign: 'center',
              background: 'rgba(224,123,57,0.07)', border: '1px solid rgba(224,123,57,0.25)',
              marginBottom: '10px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>⏳</div>
              <div style={{ fontSize: isMobile ? '14px' : '13px', color: 'var(--orange)', fontWeight: 700, marginBottom: '4px' }}>
                Waiting for Kitchen
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                The kitchen is still preparing this order. You'll see a green "Ready" button when it's done.
              </div>
            </div>
          )}

          {/* ── Step 2: Order ready — driver picks up ── */}
          {order.orderStatus === 'ready' && (
            <button
              onClick={() => handleStatus(order._id, 'delivered', '🛵 Picked up! Heading to customer.')}
              disabled={updatingId === order._id}
              style={{
                width: '100%', padding: isMobile ? '16px' : '14px',
                borderRadius: '12px', fontSize: isMobile ? '16px' : '14px', fontWeight: 700,
                cursor: 'pointer', border: 'none', marginBottom: '10px',
                background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff',
                opacity: updatingId === order._id ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
              }}
            >
              <span style={{ fontSize: '24px' }}>📦</span>
              <span>Order Ready — I've Picked It Up</span>
            </button>
          )}

          {/* ── Step 3: With driver — mark delivered when reaching customer ── */}
          {order.orderStatus === 'delivered' && (
            <button
              onClick={() => handleStatus(order._id, 'completed', '✅ Delivery complete!')}
              disabled={updatingId === order._id}
              style={{
                width: '100%', padding: isMobile ? '16px' : '14px',
                borderRadius: '12px', fontSize: isMobile ? '16px' : '14px', fontWeight: 700,
                cursor: 'pointer', border: 'none', marginBottom: '10px',
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff',
                opacity: updatingId === order._id ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              }}
            >
              <span style={{ fontSize: '24px' }}>✅</span>
              <span>Reached Customer — Mark Delivered</span>
            </button>
          )}

          {/* Completed/delivered banner */}
          {['completed'].includes(order.orderStatus) && (
            <div style={{
              padding: '12px 16px', textAlign: 'center', borderRadius: '10px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              marginBottom: '10px',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎉</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                Delivered Successfully
              </div>
            </div>
          )}

          {/* Cancel — only available while order is still active and not yet picked up */}
          {['received','confirmed','preparing','ready'].includes(order.orderStatus) && (
            <button
              onClick={() => handleStatus(order._id, 'cancelled', 'Order cancelled.')}
              disabled={updatingId === order._id}
              style={{
                width: '100%', padding: isMobile ? '12px' : '10px',
                borderRadius: '8px', fontSize: isMobile ? '14px' : '12px',
                cursor: 'pointer', fontWeight: 600,
                border: '1px solid rgba(224,82,82,0.3)',
                background: 'rgba(224,82,82,0.07)', color: 'var(--red)',
                opacity: updatingId === order._id ? 0.6 : 1,
              }}
            >
              ✖ Cancel Order
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     PAGE RENDER
  ───────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '10px' : '0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{
            fontFamily: '"Cormorant Garamond",serif',
            fontSize: isMobile ? '24px' : '28px',
            color: 'var(--text-primary)', marginBottom: '2px',
          }}>
            🛵 Delivery
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {activeOrders.length} active · {completedOrders.length} completed today
          </p>
        </div>
        <button
          className="btn-outline-gold"
          onClick={() => dispatch(fetchOrders({ type: 'delivery', limit: 100 }))}
          style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px' }}>
        {[
          { label: 'Active',        val: activeOrders.length,    color: 'var(--orange)', icon: '🛵' },
          { label: 'Completed',     val: completedOrders.length, color: 'var(--green)',  icon: '✅' },
          { label: 'Total Today',   val: deliveryOrders.length,  color: 'var(--gold)',   icon: '📦' },
          { label: 'COD Pending',
            val: activeOrders.filter(o => ['cash','cod'].includes(o.paymentMethod)).length,
            color: 'var(--blue)', icon: '💵' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase',
                             letterSpacing: '0.1em', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '18px' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontFamily: '"Cormorant Garamond",serif', fontWeight: 600, color }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Orders ── */}
      {loading && deliveryOrders.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '320px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛵</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active delivery orders</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>New deliveries will appear here automatically</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: isMobile ? '18px' : '20px', color: 'var(--text-primary)' }}>
            Active Deliveries
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))', gap: '14px' }}>
            {activeOrders.map(order => <DeliveryCard key={order._id} order={order} />)}
          </div>
        </>
      )}

      {/* ── Completed ── */}
      {completedOrders.length > 0 && (
        <>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: isMobile ? '18px' : '20px',
                       color: 'var(--text-muted)', marginTop: '8px' }}>
            Completed Today
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))', gap: '14px' }}>
            {completedOrders.slice(0, 10).map(order => <DeliveryCard key={order._id} order={order} />)}
          </div>
        </>
      )}
    </div>
  );
}
