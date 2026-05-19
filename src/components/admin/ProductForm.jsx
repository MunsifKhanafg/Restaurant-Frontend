import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createProduct, updateProduct } from '../../store/slices/productSlice';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Starters', 'Main Course', 'Grill & BBQ', 'Seafood', 'Pasta & Rice',
  'Pizza', 'Burgers', 'Salads', 'Soups', 'Desserts', 'Beverages', 'Specials',
];
const SPICE_LEVELS = ['mild', 'medium', 'hot', 'extra-hot'];

const EMPTY_FORM = {
  name: '', description: '', price: '', costPrice: '',
  category: 'Main Course', cookingTime: '15', initialStock: '100',
  lowStockThreshold: '10', isVegetarian: false, spiceLevel: 'mild', isAvailable: true,
};

const Label = ({ children }) => (
  <label style={{
    display: 'block', fontSize: '11px', color: 'var(--gold)',
    letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px',
  }}>
    {children}
  </label>
);

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
};

/**
 * ProductForm — Reusable modal form for adding / editing a menu product.
 *
 * Props:
 *   mode        — 'add' | 'edit'
 *   product     — existing product object (for edit mode)
 *   onClose     — callback to close the modal
 *   onSuccess   — optional callback after successful save
 */
export default function ProductForm({ mode = 'add', product = null, onClose, onSuccess }) {
  const dispatch = useDispatch();

  const [form, setForm] = useState(() => {
    if (mode === 'edit' && product) {
      return {
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        costPrice: product.costPrice || '',
        category: product.category || 'Main Course',
        cookingTime: product.cookingTime || '15',
        initialStock: product.initialStock || '100',
        lowStockThreshold: product.lowStockThreshold || '10',
        isVegetarian: product.isVegetarian || false,
        spiceLevel: product.spiceLevel || 'mild',
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
      };
    }
    return EMPTY_FORM;
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(mode === 'edit' ? product?.image || '' : '');
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (imageFile) fd.append('image', imageFile);

    let result;
    if (mode === 'add') {
      result = await dispatch(createProduct(fd));
    } else {
      result = await dispatch(updateProduct({ id: product._id, formData: fd }));
    }

    setSubmitting(false);

    const action = mode === 'add' ? createProduct : updateProduct;
    if (action.fulfilled.match(result)) {
      toast.success(mode === 'add' ? 'Product added!' : 'Product updated!');
      onSuccess?.();
      onClose?.();
    } else {
      toast.error(result.payload || 'Operation failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="glass-card-elevated"
        style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--text-primary)' }}>
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Image Upload */}
          <div>
            <Label>Product Image</Label>
            <div style={{
              border: '2px dashed var(--border)', borderRadius: '8px', padding: '16px',
              textAlign: 'center', cursor: 'pointer', background: 'var(--bg-elevated)', position: 'relative',
              overflow: 'hidden',
            }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>📷</div>
                  Click to upload image
                </div>
              )}
              <input
                type="file" accept="image/*" onChange={handleImageChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Name (full width) */}
          <div>
            <Label>Product Name *</Label>
            <input
              required className="input-dark"
              value={form.name} onChange={(e) => handleChange('name', e.target.value)}
              style={inputStyle} placeholder="e.g., Chicken Tikka Masala"
            />
          </div>

          {/* Price + Cost Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Selling Price (Rs.) *</Label>
              <input required type="number" min="0" className="input-dark"
                value={form.price} onChange={(e) => handleChange('price', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <Label>Cost Price (Rs.)</Label>
              <input type="number" min="0" className="input-dark"
                value={form.costPrice} onChange={(e) => handleChange('costPrice', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Category + Spice */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Category</Label>
              <select className="select-dark" value={form.category} onChange={(e) => handleChange('category', e.target.value)} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Spice Level</Label>
              <select className="select-dark" value={form.spiceLevel} onChange={(e) => handleChange('spiceLevel', e.target.value)} style={inputStyle}>
                {SPICE_LEVELS.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Cooking Time + Initial Stock + Low Threshold */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Cooking Time (min)</Label>
              <input type="number" min="0" className="input-dark"
                value={form.cookingTime} onChange={(e) => handleChange('cookingTime', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <Label>Initial Stock</Label>
              <input type="number" min="0" className="input-dark"
                value={form.initialStock} onChange={(e) => handleChange('initialStock', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <Label>Low Stock Alert</Label>
              <input type="number" min="0" className="input-dark"
                value={form.lowStockThreshold} onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea className="input-dark" rows={2}
              value={form.description} onChange={(e) => handleChange('description', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Short description of the dish..."
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { label: '🌱 Vegetarian', key: 'isVegetarian' },
              { label: '✅ Available', key: 'isAvailable' },
            ].map(({ label, key }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={form[key]}
                  onChange={(e) => handleChange(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn-outline-gold" onClick={onClose}
              style={{ flex: 1, padding: '11px', borderRadius: '8px', fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-gold" disabled={submitting}
              style={{ flex: 1, padding: '11px', borderRadius: '8px', fontSize: '13px' }}>
              {submitting ? 'Saving...' : mode === 'add' ? '+ Add Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
