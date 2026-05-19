import React from 'react';
import { useDispatch } from 'react-redux';
import { addItem } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

/**
 * MenuProductCard — A single product tile on the POS menu grid.
 *
 * Props:
 *   product   — product object from Redux store
 */
export default function MenuProductCard({ product }) {
  const dispatch = useDispatch();

  const handleAdd = () => {
    dispatch(addItem({
      product: product._id,
      name:    product.name,
      price:   product.price,
      image:   product.image,
    }));
    toast.success(`${product.name} added`, { duration: 1000 });
  };

  const imageUrl =
    product.image?.startsWith('/uploads')
      ? `${process.env.REACT_APP_SOCKET_URL}${product.image}`
      : product.image;

  return (
    <div
      onClick={handleAdd}
      className="glass-card"
      style={{
        cursor: 'pointer', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Image */}
      <div style={{ height: '100px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        {imageUrl ? (
          <img
            src={imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            🍽️
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)',
          marginBottom: '2px', lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {product.name}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)' }}>
          {formatCurrency(product.price)}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>⏱ {product.cookingTime}m</span>
          {product.isVegetarian && (
            <span style={{ fontSize: '10px', color: 'var(--green)' }}>🌱</span>
          )}
          {product.currentStock <= product.lowStockThreshold && product.currentStock > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--orange)' }}>Low</span>
          )}
        </div>
      </div>
    </div>
  );
}
