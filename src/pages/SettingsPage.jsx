import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────
   LAYOUT HELPERS
───────────────────────────────────────────────────────── */
const Section = ({ title, children }) => (
  <div className="glass-card" style={{ padding: '24px' }}>
    <h2 style={{
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: '16px', fontWeight: 700,
      color: 'var(--text-primary)',
      marginBottom: '18px', paddingBottom: '12px',
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </h2>
    {children}
  </div>
);

const Lbl = ({ children }) => (
  <label style={{
    display: 'block', fontSize: '10px',
    color: 'var(--primary)', textTransform: 'uppercase',
    fontWeight: 700, letterSpacing: '0.1em', marginBottom: '5px',
  }}>
    {children}
  </label>
);

const IS = { width: '100%', padding: '8px 12px', borderRadius: '7px', fontSize: '13px' };

/* ─────────────────────────────────────────────────────────
   QR CODE
───────────────────────────────────────────────────────── */
function CustomerQR({ restaurantName }) {
  const orderUrl  = `${window.location.origin}/guest`;
  const qrSrc     = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(orderUrl)}&choe=UTF-8&chld=M|2`;
  const [dlBusy,  setDlBusy]  = useState(false);
  const [qrError, setQrError] = useState(false);

  const download = async () => {
    setDlBusy(true);
    try {
      const res  = await fetch(qrSrc);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${(restaurantName || 'restaurant').replace(/\s+/g, '-')}-qr.png`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 6000);
    } catch {
      window.open(qrSrc, '_blank');
      toast('QR opened in new tab — right-click → Save Image', { icon: 'ℹ️' });
    }
    setDlBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '8px 0' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center',
                  lineHeight: 1.7, maxWidth: '360px' }}>
        Print or display this QR code. Customers scan it to browse the menu and
        place orders — <strong style={{ color: 'var(--primary)' }}>no app needed</strong>.
      </p>
      <div style={{
        padding: '18px', borderRadius: '16px', background: '#ffffff',
        border: '3px solid rgba(255,107,53,0.5)',
        boxShadow: '0 4px 28px rgba(255,107,53,0.2)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        {qrError ? (
          <div style={{ width: 200, height: 200, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: '#f5f5f5', borderRadius: '8px' }}>
            <span style={{ fontSize: '36px' }}>⚠️</span>
            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '0 12px' }}>
              QR unavailable.<br />Check internet connection.
            </p>
          </div>
        ) : (
          <img src={qrSrc} alt="Customer Order QR Code" width={200} height={200}
            style={{ display: 'block', borderRadius: '6px' }}
            onError={() => setQrError(true)} />
        )}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#111',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      textAlign: 'center', maxWidth: '200px' }}>
          {restaurantName || 'Scan to Order'}
        </div>
      </div>
      <button onClick={download} disabled={dlBusy || qrError} className="btn-gold"
        style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13px',
                 fontWeight: 700, cursor: 'pointer',
                 display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {dlBusy ? '⏳ Downloading…' : '⬇️ Download QR Code'}
      </button>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Orders from QR appear instantly in Kitchen &amp; Orders pages.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ROLE META
───────────────────────────────────────────────────────── */
const ROLE_META = {
  admin:   { icon: '👑', label: 'Admin',   color: '#F7C948' },
  manager: { icon: '📋', label: 'Manager', color: '#FF6B35' },
  waiter:  { icon: '🍽️', label: 'Waiter',  color: '#22C55E' },
  chef:    { icon: '👨‍🍳', label: 'Chef',    color: '#3B82F6' },
  driver:  { icon: '🛵', label: 'Driver',  color: '#8B5CF6' },
};
const ROLES      = ['admin', 'manager', 'waiter', 'chef', 'driver'];
const USER_ROLES = ['admin', 'manager', 'waiter', 'chef', 'driver'];

/* Expense categories — must match backend Expense model enum exactly */
const EXPENSE_CATEGORIES = [
  'Ingredients', 'Utilities', 'Rent', 'Supplies',
  'Maintenance', 'Marketing', 'Salary', 'Other',
];

const CATEGORY_ICON = {
  Ingredients: '🥩', Utilities: '💡', Rent: '🏠', Supplies: '📦',
  Maintenance: '🔧', Marketing: '📣', Salary: '💰', Other: '📝',
};

/* ─────────────────────────────────────────────────────────
   SINGLE USER ROW
───────────────────────────────────────────────────────── */
function UserRow({ user, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({
    name: user.name, email: user.email,
    password: '', phone: user.phone || '', role: user.role,
  });
  const [busy, setBusy] = useState(false);
  const meta = ROLE_META[user.role] || ROLE_META.waiter;

  const save = async () => {
    setBusy(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone };
      if (form.password.trim().length >= 6) payload.password = form.password.trim();
      const { data } = await api.put(`/auth/users/${user._id}`, payload);
      onUpdated({ ...user, ...data.data });
      toast.success(`✅ ${form.name} updated`);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete account for "${user.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/auth/users/${user._id}`);
      onDeleted(user._id);
      toast.success(`🗑 ${user.name} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setBusy(false);
  };

  return (
    <div style={{
      borderRadius: '9px',
      border: `1px solid ${editing ? `${meta.color}66` : 'var(--border)'}`,
      background: 'var(--bg-surface)',
      overflow: 'hidden', transition: 'border-color 0.18s',
      marginBottom: '5px',
    }}>
      {/* ── Compact display row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${meta.color}22`, border: `1px solid ${meta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)',
                        fontFamily: '"JetBrains Mono",monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🔑 {user.email}
          </div>
        </div>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: user.isActive !== false ? '#22C55E' : '#EF4444',
        }} title={user.isActive !== false ? 'Active' : 'Inactive'} />
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <button
            onClick={() => {
              setForm({ name: user.name, email: user.email, password: '', phone: user.phone || '', role: user.role });
              setEditing(v => !v);
            }}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: editing ? 'var(--primary-muted)' : 'transparent',
              borderColor: editing ? 'var(--primary)' : 'var(--border-medium)',
              color: editing ? 'var(--primary-light)' : 'var(--text-secondary)',
            }}>
            {editing ? '✕' : '✏️'}
          </button>
          <button onClick={del} disabled={busy}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.07)', color: '#EF4444',
            }}>
            🗑
          </button>
        </div>
      </div>

      {editing && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px',
                      background: 'rgba(255,107,53,0.03)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <Lbl>Full Name</Lbl>
              <input className="input-dark" style={{ ...IS, fontSize: '12px' }}
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Lbl>Email (login email)</Lbl>
              <input className="input-dark" type="email" style={{ ...IS, fontSize: '12px' }}
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Lbl>New Password (blank = keep current)</Lbl>
              <input className="input-dark" type="password" style={{ ...IS, fontSize: '12px' }}
                placeholder="Min 6 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Lbl>Phone</Lbl>
              <input className="input-dark" type="tel" style={{ ...IS, fontSize: '12px' }}
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Lbl>Role</Lbl>
              <select className="select-dark" style={{ ...IS, fontSize: '12px', cursor: 'pointer' }}
                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {USER_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_META[r]?.icon} {ROLE_META[r]?.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outline-gold" onClick={() => setEditing(false)}
              style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px' }}>
              Cancel
            </button>
            <button className="btn-gold" onClick={save} disabled={busy}
              style={{ padding: '6px 20px', borderRadius: '7px', fontSize: '12px', fontWeight: 700 }}>
              {busy ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ROLE GROUP
───────────────────────────────────────────────────────── */
function RoleGroup({ role, users, onUpdated, onDeleted }) {
  const [open, setOpen] = useState(false);
  const meta  = ROLE_META[role];
  const count = users.length;
  const firstEmail = count > 0 ? users[0].email : null;

  return (
    <div style={{
      borderRadius: '11px',
      border: `1px solid ${open ? `${meta.color}44` : 'var(--border)'}`,
      background: 'var(--bg-elevated)',
      overflow: 'hidden', transition: 'border-color 0.18s',
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 15px',
                 cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: `${meta.color}22`, border: `1px solid ${meta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: meta.color }}>{meta.label}</div>
          {firstEmail ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)',
                          fontFamily: '"JetBrains Mono",monospace',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🔑 {firstEmail}{count > 1 ? ` …+${count - 1} more` : ''}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#EF4444' }}>⚠ No accounts — create one below</div>
          )}
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
          background: count > 0 ? `${meta.color}22` : 'rgba(239,68,68,0.1)',
          color:      count > 0 ? meta.color         : '#EF4444',
          border: `1px solid ${count > 0 ? `${meta.color}44` : 'rgba(239,68,68,0.3)'}`,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {count} account{count !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
          <div style={{
            padding: '10px 13px', borderRadius: '8px', marginBottom: '12px',
            background: `${meta.color}11`, border: `1px solid ${meta.color}33`,
            fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            <strong style={{ color: meta.color }}>🔑 Login Credentials for {meta.label}:</strong>
            {count === 0 ? (
              <span> No accounts yet. Create one using the form below.</span>
            ) : count === 1 ? (
              <span> <code style={{ fontFamily: '"JetBrains Mono",monospace', color: 'var(--text-primary)' }}>{firstEmail}</code> — use ✏️ to change email or password.</span>
            ) : (
              <span> {count} accounts exist. Each has their own email &amp; password listed below.</span>
            )}
          </div>
          {count === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px 0 4px', textAlign: 'center' }}>
              No {meta.label} accounts yet. Use the form below to create one ↓
            </p>
          ) : (
            users.map(u => (
              <UserRow key={u._id} user={u} onUpdated={onUpdated} onDeleted={onDeleted} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CREATE USER FORM
───────────────────────────────────────────────────────── */
function CreateUserForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter', phone: '' });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', form);
      onCreated(data.data);
      toast.success(
        `✅ "${form.name}" (${ROLE_META[form.role]?.label}) account created!\n` +
        `Login: ${form.email}`
      );
      setForm({ name: '', email: '', password: '', role: 'waiter', phone: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    }
    setBusy(false);
  };

  const m = ROLE_META[form.role];

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '14px' }}>
        <Lbl>Select Role for New Account</Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '6px' }}>
          {USER_ROLES.map(r => {
            const rm = ROLE_META[r];
            const sel = form.role === r;
            return (
              <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                style={{
                  padding: '8px 16px', borderRadius: '9px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                  background:  sel ? `${rm.color}22` : 'var(--bg-elevated)',
                  borderColor: sel ? rm.color         : 'var(--border)',
                  color:       sel ? rm.color         : 'var(--text-secondary)',
                }}>
                {rm.icon} {rm.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px', marginBottom: '14px' }}>
        <div>
          <Lbl>Full Name *</Lbl>
          <input required className="input-dark" style={IS} placeholder="e.g. Ahmed Khan"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Lbl>Email * — used to log in</Lbl>
          <input required type="email" className="input-dark" style={IS}
            placeholder="ahmed@restaurant.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Lbl>Password * — min 6 characters</Lbl>
          <input required type="password" className="input-dark" style={IS} placeholder="••••••••"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <Lbl>Phone (optional)</Lbl>
          <input type="tel" className="input-dark" style={IS} placeholder="03XXXXXXXXX"
            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div style={{
        padding: '10px 14px', borderRadius: '9px', marginBottom: '14px',
        background: `${m.color}11`, border: `1px solid ${m.color}33`,
        fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.65,
      }}>
        <strong style={{ color: m.color }}>{m.icon} {m.label} account will be created.</strong>
        {form.email && (
          <span> Login email: <code style={{ fontFamily: '"JetBrains Mono",monospace', color: 'var(--text-primary)' }}>{form.email}</code></span>
        )}
        <span> — This account will appear immediately under the {m.label} group above.</span>
      </div>

      <button type="submit" disabled={busy} className="btn-gold"
        style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
        {busy ? 'Creating…' : `✚ Create ${m.label} Account`}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────
   EXPENSE LIST ITEM
───────────────────────────────────────────────────────── */
function ExpenseListItem({ expense, currency, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/analytics/expenses/${expense._id}`);
      toast.success('Expense deleted');
      onDelete(expense._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setDeleting(false);
  };

  const dateStr = expense.date
    ? new Date(expense.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 13px', borderRadius: '9px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      transition: 'border-color 0.15s',
    }}>
      {/* Category icon */}
      <div style={{
        width: 34, height: 34, borderRadius: '8px', flexShrink: 0,
        background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
      }}>
        {CATEGORY_ICON[expense.category] || '📝'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.title}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(255,107,53,0.12)', color: 'var(--primary-light)',
            borderRadius: '4px', padding: '1px 6px', fontWeight: 600,
          }}>
            {expense.category}
          </span>
          <span>📅 {dateStr}</span>
          {expense.notes && <span style={{ fontStyle: 'italic' }}>"{expense.notes}"</span>}
        </div>
      </div>

      {/* Amount */}
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
        {currency}{Number(expense.amount).toLocaleString()}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete expense"
        style={{
          background: 'none', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '6px', color: '#EF4444', cursor: 'pointer',
          fontSize: '13px', padding: '4px 8px', flexShrink: 0,
          opacity: deleting ? 0.5 : 1,
        }}>
        🗑
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SETTINGS PAGE
───────────────────────────────────────────────────────── */
export default function SettingsPage() {
  let refreshRestaurant = null;
  try {
    // eslint-disable-next-line
    const { useRestaurant } = require('../hooks/useRestaurant');
    const ctx = useRestaurant();
    refreshRestaurant = ctx?.refresh ?? null;
  } catch { /* hook not available */ }

  const [restaurantName, setRestaurantName] = useState('');
  const [currency,       setCurrency]       = useState('Rs.');
  const [taxPercent,     setTaxPercent]     = useState('8');
  const [address,        setAddress]        = useState('');
  const [phone,          setPhone]          = useState('');
  const [savingConfig,   setSavingConfig]   = useState(false);
  const [configLoaded,   setConfigLoaded]   = useState(false);

  const [payConfig, setPayConfig] = useState({
    jazzcash:    { number: '', accountName: '' },
    easypaisa:   { number: '', accountName: '' },
    bankaccount: { accountTitle: '', accountNumber: '', bankName: '', branchCode: '', iban: '' },
    whatsapp:    '',
  });
  const [savingPay, setSavingPay] = useState(false);

  const [staffUsers,   setStaffUsers]   = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError,   setStaffError]   = useState('');

  const [dbStatus,    setDbStatus]    = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  /* ── Expense form ── */
  const [expenseForm, setExpenseForm] = useState({
    title: '', amount: '', category: 'Ingredients',
    date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [addingExpense, setAddingExpense] = useState(false);

  /* ── Expense list ── */
  const [expenses,        setExpenses]        = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseFilter,   setExpenseFilter]   = useState('all'); // 'all' | category name

  /* ── Load restaurant config ── */
  useEffect(() => {
    api.get('/restaurant-config')
      .then(({ data }) => {
        if (data?.data) {
          setRestaurantName(data.data.name     || '');
          setCurrency(data.data.currency       || 'Rs.');
          setTaxPercent(String(data.data.taxPercent ?? 8));
          setAddress(data.data.address         || '');
          setPhone(data.data.phone             || '');
        }
      })
      .catch(() => {
        setRestaurantName(process.env.REACT_APP_RESTAURANT_NAME || 'My Restaurant');
        setCurrency(process.env.REACT_APP_CURRENCY || 'Rs.');
        setTaxPercent(process.env.REACT_APP_TAX_PERCENT || '8');
      })
      .finally(() => setConfigLoaded(true));
  }, []);

  /* ── Load payment config ── */
  useEffect(() => {
    api.get('/payment-config').then(({ data }) => {
      if (data?.data) {
        const d = data.data;
        setPayConfig({
          jazzcash:    { number: d.jazzcash?.number      || '', accountName: d.jazzcash?.accountName    || '' },
          easypaisa:   { number: d.easypaisa?.number     || '', accountName: d.easypaisa?.accountName   || '' },
          bankaccount: {
            accountTitle:  d.bankaccount?.accountTitle  || '',
            accountNumber: d.bankaccount?.accountNumber || '',
            bankName:      d.bankaccount?.bankName      || '',
            branchCode:    d.bankaccount?.branchCode    || '',
            iban:          d.bankaccount?.iban          || '',
          },
          whatsapp: d.whatsapp || '',
        });
      }
    }).catch(() => {});
  }, []);

  /* ── Load staff users ── */
  const loadStaff = useCallback(() => {
    setStaffLoading(true);
    setStaffError('');
    api.get('/auth/users')
      .then(({ data }) => { if (data?.data) setStaffUsers(data.data); })
      .catch(err => {
        const msg = err.response?.data?.message || err.message || 'Failed to load accounts';
        setStaffError(msg);
      })
      .finally(() => setStaffLoading(false));
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  /* ── Load expenses list ── */
  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const { data } = await api.get('/analytics/expenses');
      setExpenses(data?.data || []);
    } catch {
      setExpenses([]);
    }
    setExpensesLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  /* ── Handlers ── */
  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/restaurant-config', {
        name:       restaurantName.trim(),
        currency:   currency.trim(),
        taxPercent: parseFloat(taxPercent) || 8,
        address:    address.trim(),
        phone:      phone.trim(),
      });
      if (refreshRestaurant) refreshRestaurant();
      toast.success('✅ Restaurant settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
    setSavingConfig(false);
  };

  const savePay = async () => {
    setSavingPay(true);
    try {
      await api.put('/payment-config', payConfig);
      toast.success('✅ Payment settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
    setSavingPay(false);
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim()) { toast.error('Title is required'); return; }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }

    setAddingExpense(true);
    try {
      const payload = {
        title:    expenseForm.title.trim(),
        amount:   parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date:     expenseForm.date,
        notes:    expenseForm.notes.trim(),
      };
      const { data } = await api.post('/analytics/expenses', payload);
      toast.success(`✅ Expense "${payload.title}" recorded!`);
      /* Prepend to local list for instant feedback — no need to re-fetch */
      setExpenses(prev => [data.data, ...prev]);
      setExpenseForm({
        title: '', amount: '', category: 'Ingredients',
        date: new Date().toISOString().split('T')[0], notes: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Record failed — please try again');
    }
    setAddingExpense(false);
  };

  const handleExpenseDeleted = (id) => {
    setExpenses(prev => prev.filter(e => e._id !== id));
  };

  const testConn = async () => {
    setTestLoading(true);
    try {
      const res  = await fetch('/api/health');
      const json = await res.json();
      setDbStatus({ ok: true, msg: json.message || 'Server OK' });
    } catch {
      setDbStatus({ ok: false, msg: 'Connection failed — is the server running?' });
    }
    setTestLoading(false);
  };

  /* ── Staff CRUD callbacks ── */
  const handleUserCreated = (newUser) => setStaffUsers(prev => [...prev, newUser]);
  const handleUserUpdated = (u)       => setStaffUsers(prev => prev.map(x => x._id === u._id ? u : x));
  const handleUserDeleted = (id)      => setStaffUsers(prev => prev.filter(x => x._id !== id));
  const usersByRole = (role)          => staffUsers.filter(u => u.role === role);

  /* ── Filtered expenses ── */
  const filteredExpenses = expenseFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === expenseFilter);

  const totalFiltered = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>

      <div>
        <h1 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: '26px',
                     fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System configuration &amp; administration</p>
      </div>

      {/* ══ STAFF ACCOUNTS ══ */}
      <Section title="👥 Staff Accounts & Login Credentials">
        <div style={{
          padding: '12px 15px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)',
          fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8,
        }}>
          <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '4px' }}>
            🔑 How Staff Login Works
          </strong>
          Create an account for each staff member below. They use their <strong>email + password</strong> to log in.
          Use <strong>✏️</strong> to change credentials, <strong>🗑</strong> to delete.
        </div>

        {staffLoading ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            ⏳ Loading accounts…
          </div>
        ) : staffError ? (
          <div style={{
            padding: '14px', borderRadius: '8px', marginBottom: '14px',
            background: 'var(--red-muted)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '12px', color: 'var(--red)',
          }}>
            ⚠️ Could not load accounts: {staffError}
            <button onClick={loadStaff}
              style={{ marginLeft: '10px', padding: '3px 10px', borderRadius: '5px', fontSize: '11px',
                       background: 'none', border: '1px solid var(--red)', color: 'var(--red)', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
            {ROLES.map(role => (
              <RoleGroup key={role} role={role} users={usersByRole(role)}
                onUpdated={handleUserUpdated} onDeleted={handleUserDeleted} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em',
                         textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            ✚ Create New Account
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        <CreateUserForm onCreated={handleUserCreated} />
      </Section>

      {/* ══ SYSTEM STATUS ══ */}
      <Section title="🔌 System Status">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={testConn} disabled={testLoading} className="btn-outline-gold"
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12px' }}>
            {testLoading ? 'Testing…' : 'Test Connection'}
          </button>
          {dbStatus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
              background: dbStatus.ok ? 'var(--green-muted)' : 'var(--red-muted)',
              border: `1px solid ${dbStatus.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: dbStatus.ok ? 'var(--green)' : 'var(--red)',
            }}>
              {dbStatus.ok ? '✅' : '❌'} {dbStatus.msg}
            </div>
          )}
        </div>
        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { icon: '⚛️', label: 'Frontend',  val: 'React.js 18'       },
            { icon: '🚀', label: 'Backend',   val: 'Node.js + Express' },
            { icon: '🍃', label: 'Database',  val: 'MongoDB'           },
            { icon: '⚡', label: 'Real-time', val: 'Socket.io'         },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ RESTAURANT CONFIG ══ */}
      <Section title="⚙️ Restaurant Configuration">
        {!configLoaded ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              {[
                { label: 'Restaurant Name', val: restaurantName, set: setRestaurantName, ph: 'My Restaurant' },
                { label: 'Currency Symbol', val: currency,       set: setCurrency,       ph: 'Rs.' },
                { label: 'Tax (%)',          val: taxPercent,     set: setTaxPercent,     ph: '8', type: 'number' },
                { label: 'Contact Phone',    val: phone,          set: setPhone,          ph: '03XX-XXXXXXX' },
                { label: 'Address',          val: address,        set: setAddress,        ph: 'Main Street, City' },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <Lbl>{label}</Lbl>
                  <input className="input-dark" style={IS} type={type || 'text'}
                    value={val} onChange={e => set(e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
            <button onClick={saveConfig} disabled={savingConfig} className="btn-gold"
              style={{ padding: '10px 26px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
              {savingConfig ? 'Saving…' : '💾 Save Restaurant Settings'}
            </button>
          </>
        )}
      </Section>

      {/* ══ QR CODE ══ */}
      <Section title="📱 Customer Ordering QR Code">
        <CustomerQR restaurantName={restaurantName} />
      </Section>

      {/* ══ PAYMENT SETTINGS ══ */}
      <Section title="💳 Payment Account Settings">
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '9px',
                      background: 'var(--primary-muted)', border: '1px solid rgba(255,107,53,0.25)',
                      fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--primary-light)' }}>How it works:</strong> Add your account
          numbers below and save. Customers who choose JazzCash / Easypaisa / Bank at checkout will
          see your number and send payment there.
        </div>

        {/* WhatsApp */}
        <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '8px',
                      background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.22)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#25D366', marginBottom: '6px' }}>📲 WhatsApp (optional)</div>
          <input className="input-dark" style={IS} placeholder="03XXXXXXXXX — leave blank to hide"
            value={payConfig.whatsapp}
            onChange={e => setPayConfig({ ...payConfig, whatsapp: e.target.value })} />
        </div>

        {/* JazzCash */}
        <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px',
                      background: 'rgba(255,60,0,0.07)', border: '1px solid rgba(255,107,53,0.28)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF6B35', marginBottom: '10px' }}>📱 JazzCash</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Lbl>Number</Lbl>
              <input className="input-dark" style={IS} placeholder="03XX-XXXXXXX"
                value={payConfig.jazzcash.number}
                onChange={e => setPayConfig({ ...payConfig, jazzcash: { ...payConfig.jazzcash, number: e.target.value } })} />
            </div>
            <div>
              <Lbl>Account Name</Lbl>
              <input className="input-dark" style={IS} placeholder="Holder name"
                value={payConfig.jazzcash.accountName}
                onChange={e => setPayConfig({ ...payConfig, jazzcash: { ...payConfig.jazzcash, accountName: e.target.value } })} />
            </div>
          </div>
        </div>

        {/* Easypaisa */}
        <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px',
                      background: 'rgba(0,150,57,0.07)', border: '1px solid rgba(0,150,57,0.28)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#009639', marginBottom: '10px' }}>💚 Easypaisa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Lbl>Number</Lbl>
              <input className="input-dark" style={IS} placeholder="03XX-XXXXXXX"
                value={payConfig.easypaisa.number}
                onChange={e => setPayConfig({ ...payConfig, easypaisa: { ...payConfig.easypaisa, number: e.target.value } })} />
            </div>
            <div>
              <Lbl>Account Name</Lbl>
              <input className="input-dark" style={IS} placeholder="Holder name"
                value={payConfig.easypaisa.accountName}
                onChange={e => setPayConfig({ ...payConfig, easypaisa: { ...payConfig.easypaisa, accountName: e.target.value } })} />
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '8px',
                      background: 'var(--amber-muted)', border: '1px solid rgba(247,201,72,0.28)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)', marginBottom: '10px' }}>🏦 Bank Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              ['accountTitle',  'Account Title',  'Muhammad Ali'    ],
              ['bankName',      'Bank Name',       'HBL / MCB / UBL' ],
              ['accountNumber', 'Account Number',  '14-digit number' ],
              ['branchCode',    'Branch Code',     '0123'            ],
            ].map(([k, lbl, ph]) => (
              <div key={k}>
                <Lbl>{lbl}</Lbl>
                <input className="input-dark" style={IS} placeholder={ph}
                  value={payConfig.bankaccount[k]}
                  onChange={e => setPayConfig({ ...payConfig, bankaccount: { ...payConfig.bankaccount, [k]: e.target.value } })} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <Lbl>IBAN</Lbl>
              <input className="input-dark" style={IS} placeholder="PK36MEZN0001010123456789"
                value={payConfig.bankaccount.iban}
                onChange={e => setPayConfig({ ...payConfig, bankaccount: { ...payConfig.bankaccount, iban: e.target.value } })} />
            </div>
          </div>
        </div>

        <button onClick={savePay} disabled={savingPay} className="btn-gold"
          style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
          {savingPay ? 'Saving…' : '💾 Save Payment Settings'}
        </button>
      </Section>

      {/* ══ RECORD EXPENSE ══ */}
      <Section title="💸 Record Expense">

        {/* ── Add Expense Form ── */}
        <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Lbl>Title *</Lbl>
              <input required className="input-dark" style={IS}
                value={expenseForm.title}
                onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="e.g. Weekly meat purchase" />
            </div>
            <div>
              <Lbl>Amount ({currency}) *</Lbl>
              <input required type="number" min="1" step="any" className="input-dark" style={IS}
                value={expenseForm.amount}
                onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="e.g. 5000" />
            </div>
            <div>
              <Lbl>Category *</Lbl>
              <select className="select-dark" style={{ ...IS, cursor: 'pointer' }}
                value={expenseForm.category}
                onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Date *</Lbl>
              <input type="date" required className="input-dark" style={IS}
                value={expenseForm.date}
                onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Lbl>Notes (optional)</Lbl>
              <input className="input-dark" style={IS}
                value={expenseForm.notes}
                onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="Any extra details…" />
            </div>
          </div>
          <button type="submit" disabled={addingExpense} className="btn-gold"
            style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px',
                     fontWeight: 700, alignSelf: 'flex-start' }}>
            {addingExpense ? '⏳ Recording…' : '✚ Record Expense'}
          </button>
        </form>

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '24px 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                         letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            📋 Recorded Expenses
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* ── Category filter pills ── */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {['all', ...EXPENSE_CATEGORIES].map(cat => {
            const isActive = expenseFilter === cat;
            return (
              <button key={cat} onClick={() => setExpenseFilter(cat)}
                style={{
                  padding: '4px 12px', borderRadius: '999px', fontSize: '11px',
                  fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  transition: 'all 0.15s',
                  background:  isActive ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
                  borderColor: isActive ? 'transparent' : 'var(--border)',
                  color:       isActive ? '#0D0D0D'    : 'var(--text-secondary)',
                }}>
                {cat === 'all' ? '🗂 All' : `${CATEGORY_ICON[cat]} ${cat}`}
              </button>
            );
          })}
        </div>

        {/* ── Expenses list ── */}
        {expensesLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            ⏳ Loading expenses…
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{
            padding: '28px', textAlign: 'center', borderRadius: '10px',
            background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
            color: 'var(--text-muted)', fontSize: '13px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            {expenseFilter === 'all'
              ? 'No expenses recorded yet. Add one above!'
              : `No ${expenseFilter} expenses found.`}
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: '8px', marginBottom: '10px',
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                {expenseFilter !== 'all' ? ` in ${expenseFilter}` : ''}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
                Total: {currency}{totalFiltered.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '440px', overflowY: 'auto' }}>
              {filteredExpenses.map(exp => (
                <ExpenseListItem
                  key={exp._id}
                  expense={exp}
                  currency={currency}
                  onDelete={handleExpenseDeleted}
                />
              ))}
            </div>
          </>
        )}
      </Section>

    </div>
  );
}
