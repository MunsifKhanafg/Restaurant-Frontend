import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '../../store/slices/orderSlice';
import toast from 'react-hot-toast';

const STATUS_FLOW = {
  received:  { next: 'confirmed',  label: 'Confirm',      bg: '#4A9ECA', text: '#fff' },
  confirmed: { next: 'preparing',  label: 'Start Cooking', bg: '#E07B39', text: '#fff' },
  preparing: { next: 'ready',      label: 'Mark Ready',   bg: '#4CAF7D', text: '#fff' },
  ready:     { next: 'completed',  label: 'Complete',     bg: '#D4AF37', text: '#0D0D0D' },
};

const STATUS_BADGE = {
  received:  { bg: 'rgba(74,158,202,0.15)',  color: '#4A9ECA', border: 'rgba(74,158,202,0.3)' },
  confirmed: { bg: 'rgba(212,175,55,0.15)',  color: '#D4AF37', border: 'rgba(212,175,55,0.3)' },
  preparing: { bg: 'rgba(224,123,57,0.15)',  color: '#E07B39', border: 'rgba(224,123,57,0.3)' },
  ready:     { bg: 'rgba(76,175,125,0.15)',  color: '#4CAF7D', border: 'rgba(76,175,125,0.3)' },
};

function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calc = () =>
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    calc();
    const id = setInterval(calc, 10000);
    return () => clearInterval(id);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isLate = mins >= 20;

  return (
    <span style={{
      fontSize: '11px', fontWeight: '700',
      fontFamily: '"JetBrains Mono", monospace',
      color: isLate ? 'var(--red)' : 'var(--text-muted)',
      background: isLate ? 'rgba(224,82,82,0.1)' : 'var(--bg-elevated)',
      padding: '2px 8px', borderRadius: '999px',
      border: `1px solid ${isLate ? 'rgba(224,82,82,0.3)' : 'var(--border)'}`,
    }}>
      ⏱ {mins}m {secs}s
    </span>
  );
}

/**
 * KitchenCard — Displays a single order card in the Kitchen Display System.
 *
 * Props:
 *   order    — order object from Redux store
 */
export default function KitchenCard({ order }) {
  const dispatch = useDispatch();
  const [updating, setUpdating] = useState(false);

  const badge = STATUS_BADGE[order.orderStatus] || STATUS_BADGE.received;
  const step  = STATUS_FLOW[order.orderStatus];

  const handleAdvance = async () => {
    if (!step) return;
    setUpdating(true);
    const res = await dispatch(updateOrderStatus({ id: order._id, status: step.next }));
    setUpdating(false);
    if (updateOrderStatus.fulfilled.match(res)) {
      toast.success(`Order ${order.billId} → ${step.next}`);
    } else {
      toast.error('Update failed');
    }
  };

  const orderTypeLabel =
    order.orderType === 'dine-in'  ? `🪑 Table ${order.tableNumber}` :
    order.orderType === 'delivery' ? '🛵 Delivery' :
    '🥡 Takeaway';

  return (
    <div
      className="glass-card"
      style={{
        overflow: 'hidden',
        borderColor: badge.border,
        transition: 'border-color 0.3s',
      }}
    >
      {/* Card Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        background: badge.bg,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px', fontWeight: '700', color: badge.color,
          }}>
            {order.billId}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {orderTypeLabel}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: '999px',
            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
          }}>
            {order.orderStatus}
          </span>
          <ElapsedTimer createdAt={order.createdAt} />
        </div>
      </div>

      {/* Order Items */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        maxHeight: '220px', overflowY: 'auto',
      }}>
        {order.items?.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', borderRadius: '8px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {item.name}
              </div>
              {item.specialInstructions && (
                <div style={{ fontSize: '10px', color: 'var(--orange)', marginTop: '2px' }}>
                  📝 {item.specialInstructions}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '16px', fontWeight: '800', color: 'var(--gold)',
              background: 'rgba(212,175,55,0.1)',
              padding: '2px 10px', borderRadius: '6px',
            }}>
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div style={{
          padding: '6px 16px',
          fontSize: '11px', color: 'var(--orange)',
          borderTop: '1px solid var(--border)',
        }}>
          📝 {order.notes}
        </div>
      )}

      {/* Action Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: '8px',
      }}>
        {step && (
          <button
            onClick={handleAdvance}
            disabled={updating}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              border: 'none', transition: 'opacity 0.2s',
              background: step.bg, color: step.text,
              opacity: updating ? 0.6 : 1,
            }}
          >
            {updating ? '...' : step.label}
          </button>
        )}
        {order.orderStatus === 'ready' && !step?.next && (
          <div style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)',
            color: '#4CAF7D', fontSize: '13px', fontWeight: '600',
            textAlign: 'center',
          }}>
            ✅ Ready to Serve!
          </div>
        )}
      </div>
    </div>
  );
}
