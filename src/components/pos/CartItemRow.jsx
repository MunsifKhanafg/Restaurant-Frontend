import React from 'react';
import { useDispatch } from 'react-redux';
import { updateQuantity, removeItem, updateItemNote } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/helpers';

/**
 * CartItemRow — A single row in the POS cart panel.
 *
 * Props:
 *   item   — { product, name, price, quantity, specialInstructions? }
 */
export default function CartItemRow({ item }) {
  const dispatch = useDispatch();

  const handleQuantity = (delta) => {
    dispatch(updateQuantity({ product: item.product, quantity: item.quantity + delta }));
  };

  const handleRemove = () => dispatch(removeItem(item.product));

  const handleNote = (e) => {
    dispatch(updateItemNote({ product: item.product, note: e.target.value }));
  };

  return (
    <div style={{
      padding: '10px', borderRadius: '8px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    }}>
      {/* Name + Total Price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', flex: 1, marginRight: '8px' }}>
          {item.name}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>

      {/* Quantity controls + remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => handleQuantity(-1)}
          style={{
            width: '24px', height: '24px', borderRadius: '6px',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>

        <span style={{
          fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
          minWidth: '22px', textAlign: 'center',
        }}>
          {item.quantity}
        </span>

        <button
          onClick={() => handleQuantity(1)}
          style={{
            width: '24px', height: '24px', borderRadius: '6px',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>

        <button
          onClick={handleRemove}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--red)', cursor: 'pointer', fontSize: '13px', lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* Special instructions (optional) */}
      <input
        type="text"
        className="input-dark"
        placeholder="Special instructions..."
        value={item.specialInstructions || ''}
        onChange={handleNote}
        style={{
          marginTop: '7px', width: '100%',
          padding: '5px 9px', borderRadius: '5px',
          fontSize: '11px',
        }}
      />
    </div>
  );
}
