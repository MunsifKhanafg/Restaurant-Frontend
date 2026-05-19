import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCartSubtotal, selectCartTax, selectCartTotal, selectCartCount,
  clearCart, setDiscount,
} from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/helpers';
import CartItemRow from './CartItemRow';

/**
 * CartPanel — Right-side cart in the POS page.
 *
 * Props:
 *   onSubmit         — async callback to place the order
 *   submitting       — boolean; disables the Place Order button
 *   customerForm     — object { name, phone, address, deliveryZone }
 *   setCustomerForm  — state setter for customerForm
 */
export default function CartPanel({ onSubmit, submitting, customerForm, setCustomerForm }) {
  const dispatch = useDispatch();

  const cart      = useSelector((s) => s.cart);
  const subtotal  = useSelector(selectCartSubtotal);
  const tax       = useSelector(selectCartTax);
  const total     = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartCount);

  const isDelivery = cart.orderType === 'delivery';

  return (
    <div className="glass-card" style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: 'var(--text-primary)' }}>
          {cart.orderType === 'dine-in' && cart.tableNumber ? `Table ${cart.tableNumber}` : 'Order'}
        </h3>
        <span style={{
          fontSize: '11px', color: 'var(--gold)',
          background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: '999px',
        }}>
          {cartCount} items
        </span>
      </div>

      {/* Delivery fields */}
      {isDelivery && (
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {[
            ['name',         'Customer Name'],
            ['phone',        'Phone'],
            ['address',      'Address'],
            ['deliveryZone', 'Delivery Zone'],
          ].map(([key, placeholder]) => (
            <input
              key={key}
              className="input-dark"
              placeholder={placeholder}
              value={customerForm[key] || ''}
              onChange={(e) => setCustomerForm({ ...customerForm, [key]: e.target.value })}
              style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '12px', width: '100%' }}
            />
          ))}
        </div>
      )}

      {/* Items List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cart.items.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', gap: '8px', paddingTop: '40px',
          }}>
            <span style={{ fontSize: '36px' }}>🛒</span>
            <p style={{ fontSize: '13px' }}>Cart is empty</p>
            <p style={{ fontSize: '11px' }}>Click menu items to add</p>
          </div>
        ) : (
          cart.items.map((item) => <CartItemRow key={item.product} item={item} />)
        )}
      </div>

      {/* Totals + Place Order */}
      {cart.items.length > 0 && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(subtotal)}</span>
          </div>
          {/* Tax */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tax ({cart.taxPercent}%)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(tax)}</span>
          </div>
          {/* Discount */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>Discount</span>
            <input
              type="number" min="0"
              value={cart.discountAmount}
              onChange={(e) => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
              className="input-dark"
              style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
            />
          </div>

          <hr className="divider-gold" />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>TOTAL</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gold)' }}>{formatCurrency(total)}</span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-outline-gold"
              onClick={() => dispatch(clearCart())}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px' }}
            >
              Clear
            </button>
            <button
              className="btn-gold"
              onClick={onSubmit}
              disabled={submitting}
              style={{ flex: 2, padding: '10px', borderRadius: '8px', fontSize: '13px' }}
            >
              {submitting ? 'Placing...' : '🧾 Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
