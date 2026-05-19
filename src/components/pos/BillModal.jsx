import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { printBill } from '../../utils/helpers';

/**
 * BillModal — Success modal shown after an order is placed, with print option.
 *
 * Props:
 *   order     — the created order object
 *   onClose   — callback to dismiss the modal
 */
export default function BillModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    printBill(order);
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div
        className="glass-card-elevated"
        style={{ width: '100%', maxWidth: '380px', padding: '28px' }}
      >
        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '4px' }}>
            Order Placed!
          </h2>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {order.billId}
          </p>
          {order.createdAt && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {formatDateTime(order.createdAt)}
            </p>
          )}
        </div>

        {/* Order meta */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {order.tableNumber && (
            <span className="badge badge-gold">🪑 Table {order.tableNumber}</span>
          )}
          <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{order.orderType}</span>
          <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{order.paymentMethod}</span>
        </div>

        {/* Itemized List */}
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: '8px',
          padding: '14px', marginBottom: '16px',
        }}>
          {order.items?.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '13px', marginBottom: '4px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.name} × {item.quantity}</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <hr className="divider-gold" />

          {/* Subtotals */}
          {[
            ['Subtotal', formatCurrency(order.subtotal)],
            [`Tax (${order.taxPercentage}%)`, formatCurrency(order.taxAmount)],
            order.discountAmount > 0 ? ['Discount', `- ${formatCurrency(order.discountAmount)}`] : null,
            order.deliveryCharge > 0 ? ['Delivery', formatCurrency(order.deliveryCharge)] : null,
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
            </div>
          ))}

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontWeight: '700', color: 'var(--gold)', marginTop: '6px',
            paddingTop: '6px', borderTop: '1px solid var(--border)',
          }}>
            <span>TOTAL</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline-gold" onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
            Close
          </button>
          <button className="btn-gold" onClick={handlePrint}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
            🖨️ Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}
