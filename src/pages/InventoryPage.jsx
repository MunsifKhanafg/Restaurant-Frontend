import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useModal } from '../components/common/AppModal';

const CATEGORIES = ['Meat', 'Seafood', 'Vegetables', 'Dairy', 'Grains', 'Spices', 'Beverages', 'Packaging', 'Other'];
const UNITS = ['kg', 'g', 'liter', 'ml', 'piece', 'dozen', 'box', 'bottle'];
const EMPTY = { name: '', category: 'Vegetables', unit: 'kg', currentQuantity: '', minimumQuantity: '5', costPerUnit: '', supplier: '', usagePerOrder: '0.1' };

export default function InventoryPage() {
  const showModal = useModal();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/inventory');
      setItems(data.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModal('add'); };
  const openEdit = (item) => {
    setForm({ name: item.name, category: item.category, unit: item.unit, currentQuantity: item.currentQuantity, minimumQuantity: item.minimumQuantity, costPerUnit: item.costPerUnit, supplier: item.supplier, usagePerOrder: item.usagePerOrder });
    setEditing(item);
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'add') {
        await api.post('/inventory', form);
        toast.success('Item added!');
      } else {
        await api.put(`/inventory/${editing._id}`, form);
        toast.success('Item updated!');
      }
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const handleDelete = async (id) => {
    showModal('warning', 'Delete Item', 'Delete this inventory item? This cannot be undone.', async () => {
      try {
        await api.delete(`/inventory/${id}`);
        toast.success('Deleted');
        load();
      } catch { toast.error('Delete failed'); }
    });
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter ? item.category === catFilter : true;
    const matchStock = stockFilter ? item.stockStatus === stockFilter : true;
    return matchSearch && matchCat && matchStock;
  });

  const getStockStyle = (status) => {
    if (status === 'finished') return { bg: 'rgba(224,82,82,0.1)', color: 'var(--red)', border: 'rgba(224,82,82,0.3)', label: 'Out of Stock' };
    if (status === 'low') return { bg: 'rgba(224,123,57,0.1)', color: 'var(--orange)', border: 'rgba(224,123,57,0.3)', label: 'Low Stock' };
    return { bg: 'rgba(76,175,125,0.1)', color: 'var(--green)', border: 'rgba(76,175,125,0.3)', label: 'Available' };
  };

  const alertCount = items.filter(i => i.stockStatus !== 'available').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Inventory</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{items.length} items tracked</p>
        </div>
        <button className="btn-gold" onClick={openAdd} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>
          + Add Item
        </button>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: 'var(--red)', fontWeight: '600' }}>{alertCount} item(s) need restocking</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input className="input-dark" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', flex: 1, minWidth: '180px' }} />
        <select className="select-dark" value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-dark" value={stockFilter} onChange={e => setStockFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">All Stock</option>
          <option value="available">Available</option>
          <option value="low">Low Stock</option>
          <option value="finished">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No inventory items found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Min. Required</th>
                  <th>Unit</th>
                  <th>Cost/Unit</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const ss = getStockStyle(item.stockStatus);
                  return (
                    <tr key={item._id} style={{ background: item.stockStatus === 'finished' ? 'rgba(224,82,82,0.03)' : item.stockStatus === 'low' ? 'rgba(224,123,57,0.03)' : 'transparent' }}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: item.stockStatus !== 'available' ? ss.color : 'var(--text-primary)' }}>
                          {item.currentQuantity} {item.unit}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.minimumQuantity} {item.unit}</td>
                      <td>{item.unit}</td>
                      <td>{item.costPerUnit ? formatCurrency(item.costPerUnit) : '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{item.supplier || '—'}</td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                          {ss.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(item)} className="btn-outline-gold" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>Edit</button>
                          <button onClick={() => handleDelete(item._id)} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: 'var(--red)', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--text-primary)' }}>
                {modal === 'add' ? 'Add Inventory Item' : 'Edit Item'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Item Name</label>
                <input required className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Category</label>
                  <select className="select-dark" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Unit</label>
                  <select className="select-dark" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Current Qty</label>
                  <input type="number" required className="input-dark" value={form.currentQuantity} onChange={e => setForm({ ...form, currentQuantity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Min. Required</label>
                  <input type="number" className="input-dark" value={form.minimumQuantity} onChange={e => setForm({ ...form, minimumQuantity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Cost/Unit (Rs.)</label>
                  <input type="number" className="input-dark" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Usage/Order</label>
                  <input type="number" step="0.01" className="input-dark" value={form.usagePerOrder} onChange={e => setForm({ ...form, usagePerOrder: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Supplier</label>
                <input className="input-dark" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-outline-gold" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  {modal === 'add' ? 'Add Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
