import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../store/slices/productSlice';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';
import { useModal } from '../components/common/AppModal';

// ── Updated categories: added Tea & Beverages, Cakes & Pastries, Fast Food ──
const CATEGORIES = [
  'Starters','Main Course','Grill & BBQ','Seafood','Pasta & Rice','Pizza',
  'Burgers','Fast Food','Salads','Soups','Desserts',
  'Cakes & Pastries','Tea & Beverages','Beverages','Specials'
];

// Category icons for menu cards
const CAT_ICONS = {
  'Starters': '🥗', 'Main Course': '🍛', 'Grill & BBQ': '🔥', 'Seafood': '🦞',
  'Pasta & Rice': '🍝', 'Pizza': '🍕', 'Burgers': '🍔', 'Fast Food': '🍟',
  'Salads': '🥙', 'Soups': '🍜', 'Desserts': '🍮', 'Cakes & Pastries': '🎂',
  'Tea & Beverages': '☕', 'Beverages': '🥤', 'Specials': '⭐'
};

// High-quality Unsplash food photos per category (used as fallback when no uploaded image)
const CAT_FALLBACK_IMAGES = {
  'Starters':        'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
  'Main Course':     'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Grill & BBQ':     'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
  'Seafood':         'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'Pasta & Rice':    'https://images.unsplash.com/photo-1473093226555-0f498d68baf6?w=400&q=80',
  'Pizza':           'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
  'Burgers':         'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Fast Food':       'https://images.unsplash.com/photo-1552895638-f7fe08d2f7d5?w=400&q=80',
  'Salads':          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'Soups':           'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&q=80',
  'Desserts':        'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80',
  'Cakes & Pastries':'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  'Tea & Beverages': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Beverages':       'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'Specials':        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
};

const EMPTY = {
  name:'', description:'', price:'', costPrice:'', category:'Main Course',
  cookingTime:'15', initialStock:'100', lowStockThreshold:'10',
  isVegetarian:false, spiceLevel:'mild', isAvailable:true
};

export default function MenuPage() {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((s) => s.products);
  const showModal = useModal();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  // Image lightbox state
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const openAdd = () => { setForm(EMPTY); setEditing(null); setImageFile(null); setPreview(''); setModal('add'); };
  const openEdit = (p) => {
    setForm({
      name:p.name, description:p.description||'', price:p.price, costPrice:p.costPrice||'',
      category:p.category, cookingTime:p.cookingTime, initialStock:p.initialStock,
      lowStockThreshold:p.lowStockThreshold, isVegetarian:p.isVegetarian,
      spiceLevel:p.spiceLevel, isAvailable:p.isAvailable
    });
    setEditing(p); setImageFile(null); setPreview(p.image||''); setModal('edit');
  };

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (imageFile) fd.append('image', imageFile);
    let result;
    if (modal === 'add') result = await dispatch(createProduct(fd));
    else result = await dispatch(updateProduct({ id: editing._id, formData: fd }));
    if ((modal === 'add' ? createProduct : updateProduct).fulfilled.match(result)) {
      toast.success(modal === 'add' ? 'Product added!' : 'Product updated!');
      setModal(null);
    } else toast.error(result.payload || 'Operation failed');
  };

  const handleDelete = async (id) => {
    showModal('warning', 'Delete Product', 'Are you sure you want to delete this product? This cannot be undone.', async () => {
      const res = await dispatch(deleteProduct(id));
      if (deleteProduct.fulfilled.match(res)) toast.success('Deleted');
      else toast.error(res.payload);
    });
  };

  const getImageUrl = (p) =>
    p.image ? (p.image.startsWith('/uploads') ? `${process.env.REACT_APP_SOCKET_URL}${p.image}` : p.image) : null;

  // Returns uploaded image, or a beautiful category fallback photo
  const getDisplayImage = (p) => getImageUrl(p) || CAT_FALLBACK_IMAGES[p.category] || CAT_FALLBACK_IMAGES['Specials'];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter ? p.category === catFilter : true;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <input className="input-dark" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', minWidth: '200px' }} />
          <select className="select-dark" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
          </select>
        </div>
        <button className="btn-gold" onClick={openAdd} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>
          + Add Product
        </button>
      </div>

      {/* Category quick-filter pills with icons */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('')}
          style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
            background: catFilter === '' ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
            borderColor: catFilter === '' ? 'transparent' : 'var(--border)',
            color: catFilter === '' ? '#0D0D0D' : 'var(--text-secondary)' }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
              background: catFilter === c ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
              borderColor: catFilter === c ? 'transparent' : 'var(--border)',
              color: catFilter === c ? '#0D0D0D' : 'var(--text-secondary)' }}>
            {CAT_ICONS[c]} {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: '16px' }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
          <p>No products found. Add your first menu item!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: '16px' }}>
          {filtered.map((p) => {
            return (
              <div key={p._id} className="glass-card" style={{ overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                {/* Image — always shows real food photo (uploaded or category fallback) */}
                <div
                  style={{ height: '180px', background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}
                  onClick={() => setLightbox({ url: getDisplayImage(p), name: p.name })}
                >
                  <img
                    src={getDisplayImage(p)}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    className="product-card-image"
                    onError={e => { e.target.src = CAT_FALLBACK_IMAGES['Specials']; }}
                  />
                  {/* Gradient overlay for readability */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)', pointerEvents: 'none' }} />
                  {/* Stock badge */}
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <span className={`badge ${p.stockStatus === 'finished' ? 'badge-red' : p.stockStatus === 'low' ? 'badge-orange' : 'badge-green'}`}>
                      {p.stockStatus === 'finished' ? 'Out' : p.stockStatus === 'low' ? 'Low' : 'In Stock'}
                    </span>
                  </div>
                  {p.isVegetarian && (
                    <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                      <span className="badge badge-green">🌱 Veg</span>
                    </div>
                  )}
                  {/* Category chip bottom-left */}
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '11px', fontWeight: '600', background: 'rgba(0,0,0,0.6)', color: '#E8C84A', borderRadius: '6px', padding: '3px 8px', backdropFilter: 'blur(4px)', letterSpacing: '0.04em' }}>
                    {CAT_ICONS[p.category]} {p.category}
                  </div>
                  {/* Zoom hint on hover */}
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '16px', opacity: 0.7 }}>🔍</div>
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>{p.name}</h3>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gold)', marginLeft: '8px', whiteSpace: 'nowrap' }}>{formatCurrency(p.price)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{p.category}</span>
                    <span>⏱ {p.cookingTime}m</span>
                    <span>📦 {p.currentStock} left</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-outline-gold" onClick={() => openEdit(p)} style={{ flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12px' }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(p._id)}
                      style={{ padding: '7px 12px', borderRadius: '6px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setLightbox(null)}>
          <div style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name}
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }} />
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontFamily: '"Cormorant Garamond", serif', fontSize: '18px' }}>{lightbox.name}</p>
            <button onClick={() => setLightbox(null)}
              style={{ marginTop: '14px', padding: '8px 24px', borderRadius: '8px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--border-strong)', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px' }}>
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--text-primary)' }}>
                {modal === 'add' ? '➕ Add New Product' : '✏️ Edit Product'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>Product Image</label>
                <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-elevated)', position: 'relative' }}>
                  {preview ? <img src={preview} alt="preview" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} /> :
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>📷 Click to upload image</div>}
                  <input type="file" accept="image/*" onChange={handleImage} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Product Name', key: 'name', required: true, full: true },
                  { label: 'Selling Price (Rs.)', key: 'price', type: 'number', required: true },
                  { label: 'Cost Price (Rs.)', key: 'costPrice', type: 'number' },
                  { label: 'Cooking Time (min)', key: 'cookingTime', type: 'number' },
                  { label: 'Initial Stock', key: 'initialStock', type: 'number' },
                  { label: 'Low Stock Alert', key: 'lowStockThreshold', type: 'number' },
                ].map(({ label, key, type = 'text', required, full }) => (
                  <div key={key} style={full ? { gridColumn: '1/-1' } : {}}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>{label}</label>
                    <input type={type} required={required} className="input-dark"
                      value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Category</label>
                  <select className="select-dark" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Spice Level</label>
                  <select className="select-dark" value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    {['mild','medium','hot','extra-hot'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Description</label>
                <textarea className="input-dark" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ label: '🌱 Vegetarian', key: 'isVegetarian' }, { label: '✅ Available', key: 'isAvailable' }].map(({ label, key }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-outline-gold" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  {modal === 'add' ? '➕ Add Product' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
