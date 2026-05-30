import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useModal } from '../components/common/AppModal';
import { useRestaurant } from '../hooks/useRestaurant';

// ── Defined OUTSIDE SettingsPage so React never treats them as new component
// ── types on re-render, which would cause unmount/remount, scroll-jump & focus-loss
const Section = ({ title, children }) => (
  <div className="glass-card" style={{ padding: '24px' }}>
    <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
      {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</label>
    {children}
  </div>
);

/* ────────────────────────────────────────────────
   CUSTOMER ORDER LINK COMPONENT
   Shows the shareable /guest link + QR code.
   No external library needed — uses Google Charts QR API.
──────────────────────────────────────────────── */
function CustomerOrderLink({ restaurantName }) {
  const baseUrl = window.location.origin;
  const orderUrl = `${baseUrl}/guest`;
  const loginUrl = `${baseUrl}/login`;

  // Google Charts QR code (free, no API key)
  const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(orderUrl)}&choe=UTF-8&chld=M|2`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ ${label} copied to clipboard!`);
    }).catch(() => {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert(`✅ ${label} copied!`);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Explanation */}
      <div style={{ padding: '14px 16px', borderRadius: '10px',
                    background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Share this link or QR code with your customers. They open it on their phone,
          enter their name, and can browse the menu and place orders directly —
          <strong style={{ color: 'var(--gold)' }}> no app download needed</strong>.
          Their order appears instantly in your Kitchen and Orders pages.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: '#fff',
                        border: '2px solid rgba(212,175,55,0.4)',
                        boxShadow: '0 4px 20px rgba(212,175,55,0.15)' }}>
            <img
              src={qrSrc}
              alt="Customer Order QR Code"
              width={160} height={160}
              style={{ display: 'block', borderRadius: '4px' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '160px', lineHeight: 1.5 }}>
            Scan to open menu on phone
          </div>
          <a
            href={qrSrc}
            download={`${(restaurantName || 'restaurant').replace(/\s+/g, '-')}-order-qr.png`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            ⬇️ Download QR
          </a>
        </div>

        {/* Links */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Direct order link */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase',
                          fontWeight: 700, letterSpacing: '0.1em', marginBottom: '6px' }}>
              📦 Direct Order Link
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', fontSize: '12px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--gold)', fontFamily: '"JetBrains Mono",monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {orderUrl}
              </div>
              <button onClick={() => copyToClipboard(orderUrl, 'Order link')}
                style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                         cursor: 'pointer', border: '1px solid rgba(212,175,55,0.35)',
                         background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                📋 Copy
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
              Customer skips name entry — goes directly to menu
            </div>
          </div>

          {/* Login page link */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase',
                          fontWeight: 700, letterSpacing: '0.1em', marginBottom: '6px' }}>
              👤 Login Page (with name entry)
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', fontSize: '12px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)', fontFamily: '"JetBrains Mono",monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loginUrl}
              </div>
              <button onClick={() => copyToClipboard(loginUrl, 'Login link')}
                style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                         cursor: 'pointer', border: '1px solid rgba(212,175,55,0.35)',
                         background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                📋 Copy
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
              Customer enters name first — their orders are tracked by name
            </div>
          </div>

          {/* Step-by-step guide */}
          <div style={{ padding: '14px', borderRadius: '10px',
                        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: '11px', color: '#3B82F6', textTransform: 'uppercase',
                          fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>
              📋 How Customers Order
            </div>
            {[
              { n: '1', text: 'Scan QR code or open the link on their phone' },
              { n: '2', text: 'Tap “Continue as Customer” → enter name' },
              { n: '3', text: 'Browse menu, add items to cart, choose order type' },
              { n: '4', text: 'Tap “Place Order” — goes straight to your kitchen!' },
              { n: '5', text: 'Switch to “My Orders” tab to see live status updates' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '7px' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.2)',
                               border: '1px solid rgba(59,130,246,0.4)', fontSize: '11px', fontWeight: 700,
                               color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                               flexShrink: 0 }}>{step.n}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.text}</span>
              </div>
            ))}
          </div>

          {/* Test link */}
          <a href="/guest" target="_blank" rel="noreferrer"
            className="btn-outline-gold"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                     padding: '11px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                     textDecoration: 'none', cursor: 'pointer' }}>
            👁️ Preview as Customer
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const showModal = useModal();
  const { refresh: refreshRestaurant } = useRestaurant();

  // Restaurant config — loaded from DB, saved to DB
  const [restaurantName, setRestaurantName] = useState('');
  const [currency, setCurrency] = useState('Rs.');
  const [taxPercent, setTaxPercent] = useState('8');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [testLoading, setTestLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'waiter', phone: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0], notes: '' });
  const [addingExpense, setAddingExpense] = useState(false);

  // ── Payment Config ──
  const [payConfig, setPayConfig] = useState({
    jazzcash:    { number: '', accountName: '' },
    easypaisa:  { number: '', accountName: '' },
    bankaccount: { accountTitle: '', accountNumber: '', bankName: '', branchCode: '', iban: '' },
    whatsapp:   '',
  });
  const [savingPay, setSavingPay] = useState(false);

  // Load restaurant config from DB on mount
  useEffect(() => {
    api.get('/restaurant-config').then(({ data }) => {
      if (data?.data) {
        setRestaurantName(data.data.name || '');
        setCurrency(data.data.currency || 'Rs.');
        setTaxPercent(String(data.data.taxPercent ?? 8));
        setRestaurantAddress(data.data.address || '');
        setRestaurantPhone(data.data.phone || '');
      }
      setConfigLoaded(true);
    }).catch(() => {
      // fallback to env
      setRestaurantName(process.env.REACT_APP_RESTAURANT_NAME || 'My Restaurant');
      setCurrency(process.env.REACT_APP_CURRENCY || 'Rs.');
      setTaxPercent(process.env.REACT_APP_TAX_PERCENT || '8');
      setConfigLoaded(true);
    });
  }, []);

  useEffect(() => {
    api.get('/payment-config').then(({ data }) => {
      if (data?.data) {
        setPayConfig({
          jazzcash: {
            number:      data.data.jazzcash?.number      ?? '',
            accountName: data.data.jazzcash?.accountName ?? '',
          },
          easypaisa: {
            number:      data.data.easypaisa?.number      ?? '',
            accountName: data.data.easypaisa?.accountName ?? '',
          },
          bankaccount: {
            accountTitle:  data.data.bankaccount?.accountTitle  ?? '',
            accountNumber: data.data.bankaccount?.accountNumber ?? '',
            bankName:      data.data.bankaccount?.bankName      ?? '',
            branchCode:    data.data.bankaccount?.branchCode    ?? '',
            iban:          data.data.bankaccount?.iban          ?? '',
          },
          whatsapp: data.data.whatsapp ?? '',
        });
      }
    }).catch(() => {});
  }, []);

  // Save restaurant config to DB
  const handleSaveRestaurantConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/restaurant-config', {
        name: restaurantName.trim(),
        currency: currency.trim(),
        taxPercent: parseFloat(taxPercent) || 8,
        address: restaurantAddress.trim(),
        phone: restaurantPhone.trim(),
      });
      // Refresh context so sidebar + guest page update immediately
      refreshRestaurant();
      showModal('success', '✅ Restaurant Settings Saved', `Restaurant name updated to "${restaurantName}". All pages will reflect this change immediately.`);
    } catch (err) {
      showModal('error', 'Save Failed', err.response?.data?.message || 'Failed to save restaurant settings. Please try again.');
    }
    setSavingConfig(false);
  };

  const handleSavePayConfig = async () => {
    setSavingPay(true);
    try {
      const { data: saved } = await api.put('/payment-config', payConfig);
      if (saved?.data) {
        setPayConfig({
          jazzcash: {
            number:      saved.data.jazzcash?.number      ?? '',
            accountName: saved.data.jazzcash?.accountName ?? '',
          },
          easypaisa: {
            number:      saved.data.easypaisa?.number      ?? '',
            accountName: saved.data.easypaisa?.accountName ?? '',
          },
          bankaccount: {
            accountTitle:  saved.data.bankaccount?.accountTitle  ?? '',
            accountNumber: saved.data.bankaccount?.accountNumber ?? '',
            bankName:      saved.data.bankaccount?.bankName      ?? '',
            branchCode:    saved.data.bankaccount?.branchCode    ?? '',
            iban:          saved.data.bankaccount?.iban          ?? '',
          },
          whatsapp: saved.data.whatsapp ?? '',
        });
      }
      showModal('success', '✅ Payment Settings Saved', 'Your JazzCash, Easypaisa, Bank Account and WhatsApp details have been saved to the database. They will now appear at checkout.');
    } catch (err) {
      showModal('error', 'Save Failed', err.response?.data?.message || 'Failed to save payment settings. Please check your connection and try again.');
    }
    setSavingPay(false);
  };

  const EXPENSE_CATEGORIES = ['Ingredients', 'Utilities', 'Maintenance', 'Marketing', 'Rent', 'Equipment', 'Other'];
  const USER_ROLES = ['admin', 'manager', 'waiter', 'chef', 'driver'];

  const testConnection = async () => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setDbStatus({ ok: true, message: json.message });
      showModal('success', 'Connected', 'Server connection is working correctly.');
    } catch (err) {
      setDbStatus({ ok: false, message: 'Connection failed' });
      showModal('error', 'Connection Failed', 'Could not reach the server. Make sure the backend is running.');
    }
    setTestLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.post('/auth/register', newUser);
      showModal('success', 'User Created', `Login account for ${newUser.name} has been created successfully.`);
      setNewUser({ name: '', email: '', password: '', role: 'waiter', phone: '' });
    } catch (err) {
      showModal('error', 'Create Failed', err.response?.data?.message || 'Failed to create user. Please try again.');
    }
    setCreatingUser(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setAddingExpense(true);
    try {
      await api.post('/analytics/expenses', expenseForm);
      showModal('success', 'Expense Recorded', `"${expenseForm.title}" has been logged to your expense records.`);
      setExpenseForm({ title: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) {
      showModal('error', 'Record Failed', err.response?.data?.message || 'Failed to record expense. Please try again.');
    }
    setAddingExpense(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
      <div>
        <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Settings</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System configuration & administration</p>
      </div>

      {/* System Status */}
      <Section title="🔌 System Status">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button onClick={testConnection} disabled={testLoading} className="btn-outline-gold" style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px' }}>
            {testLoading ? 'Testing...' : 'Test Server Connection'}
          </button>
          {dbStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: dbStatus.ok ? 'rgba(76,175,125,0.1)' : 'rgba(224,82,82,0.1)', border: `1px solid ${dbStatus.ok ? 'rgba(76,175,125,0.3)' : 'rgba(224,82,82,0.3)'}` }}>
              <span style={{ fontSize: '14px' }}>{dbStatus.ok ? '✅' : '❌'}</span>
              <span style={{ fontSize: '12px', color: dbStatus.ok ? 'var(--green)' : 'var(--red)' }}>{dbStatus.message}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Frontend', val: 'React.js 18', icon: '⚛️' },
            { label: 'Backend', val: 'Node.js + Express', icon: '🚀' },
            { label: 'Database', val: 'MongoDB', icon: '🍃' },
            { label: 'Real-time', val: 'Socket.io', icon: '⚡' },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Restaurant Config — saved to DB */}
      <Section title="⚙️ Restaurant Configuration">
        {!configLoaded ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading settings...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Restaurant Name">
                <input
                  className="input-dark"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  placeholder="e.g. My Restaurant"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </Field>
              <Field label="Currency Symbol">
                <input
                  className="input-dark"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  placeholder="e.g. Rs. or $"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </Field>
              <Field label="Tax Percentage (%)">
                <input
                  type="number" min="0" max="100"
                  className="input-dark"
                  value={taxPercent}
                  onChange={e => setTaxPercent(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </Field>
              <Field label="Contact Phone">
                <input
                  className="input-dark"
                  value={restaurantPhone}
                  onChange={e => setRestaurantPhone(e.target.value)}
                  placeholder="e.g. 03XX-XXXXXXX"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </Field>
              <Field label="Address">
                <input
                  className="input-dark"
                  value={restaurantAddress}
                  onChange={e => setRestaurantAddress(e.target.value)}
                  placeholder="e.g. Main Street, Lahore"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </Field>
            </div>
            <div style={{ marginTop: '6px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              💡 These settings are saved to the database. The restaurant name will update in the sidebar and guest order page immediately after saving.
            </div>
            <button
              onClick={handleSaveRestaurantConfig}
              disabled={savingConfig}
              className="btn-gold"
              style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
              {savingConfig ? 'Saving...' : '💾 Save Restaurant Settings'}
            </button>
          </>
        )}
      </Section>

      {/* Create User */}
      <Section title="👤 Create User Account">
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Full Name', key: 'name', type: 'text', required: true },
              { label: 'Email', key: 'email', type: 'email', required: true },
              { label: 'Password', key: 'password', type: 'password', required: true },
              { label: 'Phone', key: 'phone', type: 'tel' },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                <input type={type} required={required} className="input-dark" value={newUser[key]} onChange={e => setNewUser({ ...newUser, [key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Role</label>
            <select className="select-dark" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
              {USER_ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={creatingUser} className="btn-gold" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px', alignSelf: 'flex-start' }}>
            {creatingUser ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </Section>

      {/* Record Expense */}
      <Section title="💸 Record Expense">
        <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Expense Title</label>
              <input required className="input-dark" value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} placeholder="e.g., Weekly meat purchase" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Amount ({currency})</label>
              <input required type="number" className="input-dark" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Category</label>
              <select className="select-dark" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Date</label>
              <input type="date" required className="input-dark" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
          </div>
          <button type="submit" disabled={addingExpense} className="btn-gold" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px', alignSelf: 'flex-start' }}>
            {addingExpense ? 'Recording...' : 'Record Expense'}
          </button>
        </form>
      </Section>

      {/* Payment Config */}
      <Section title="💳 Payment Account Settings">

        <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '8px' }}>ℹ️ How Payment Accounts Work</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              ['1', 'Enter your JazzCash / Easypaisa number or Bank details below and save.'],
              ['2', 'When a customer selects JazzCash / Easypaisa / Bank at checkout, the account number is shown to them.'],
              ['3', 'Customer sends payment to that number and provides a Transaction / Reference number.'],
              ['4', 'Staff verify the payment reference in the Orders page before confirming the order.'],
              ['5', 'WhatsApp number below is shown as an optional channel — customer can send a screenshot there for manual verification.'],
            ].map(([n, txt]) => (
              <div key={n} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)', fontWeight: '700', minWidth: '16px' }}>{n}.</span>
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '8px', background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#25D366' }}>📲 WhatsApp Number</div>
            <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>OPTIONAL</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.6 }}>
            If provided, this number is shown at checkout as an <strong style={{ color: 'var(--text-secondary)' }}>optional</strong> channel where customers can send a payment screenshot for manual verification.
          </p>
          <input
            className="input-dark"
            placeholder="e.g. 03001234567  (leave blank to hide)"
            value={payConfig.whatsapp}
            onChange={e => setPayConfig({ ...payConfig, whatsapp: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        {/* JazzCash */}
        <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '8px', background: 'rgba(255,60,0,0.07)', border: '1px solid rgba(255,60,0,0.25)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#FF6B35', marginBottom: '10px' }}>📱 JazzCash</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Mobile Number</label>
              <input className="input-dark" placeholder="03XX-XXXXXXX" value={payConfig.jazzcash.number}
                onChange={e => setPayConfig({ ...payConfig, jazzcash: { ...payConfig.jazzcash, number: e.target.value } })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Account Name</label>
              <input className="input-dark" placeholder="Account holder name" value={payConfig.jazzcash.accountName}
                onChange={e => setPayConfig({ ...payConfig, jazzcash: { ...payConfig.jazzcash, accountName: e.target.value } })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
          </div>
        </div>

        {/* Easypaisa */}
        <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '8px', background: 'rgba(0,150,57,0.07)', border: '1px solid rgba(0,150,57,0.25)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#009639', marginBottom: '10px' }}>💚 Easypaisa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Mobile Number</label>
              <input className="input-dark" placeholder="03XX-XXXXXXX" value={payConfig.easypaisa.number}
                onChange={e => setPayConfig({ ...payConfig, easypaisa: { ...payConfig.easypaisa, number: e.target.value } })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Account Name</label>
              <input className="input-dark" placeholder="Account holder name" value={payConfig.easypaisa.accountName}
                onChange={e => setPayConfig({ ...payConfig, easypaisa: { ...payConfig.easypaisa, accountName: e.target.value } })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '8px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)', marginBottom: '10px' }}>🏦 Bank Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              ['accountTitle',  'Account Title',  'e.g. Muhammad Ali'],
              ['bankName',      'Bank Name',      'e.g. HBL / MCB / UBL'],
              ['accountNumber', 'Account Number', '14-digit account number'],
              ['branchCode',    'Branch Code',    'e.g. 0123'],
              ['iban',          'IBAN',           'PK36MEZN0001010123456789'],
            ].map(([key, label, placeholder]) => (
              <div key={key} style={key === 'iban' ? { gridColumn: '1/-1' } : {}}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                <input className="input-dark" placeholder={placeholder} value={payConfig.bankaccount[key]}
                  onChange={e => setPayConfig({ ...payConfig, bankaccount: { ...payConfig.bankaccount, [key]: e.target.value } })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSavePayConfig} disabled={savingPay} className="btn-gold"
          style={{ padding: '11px 32px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
          {savingPay ? 'Saving...' : '💾 Save Payment Settings'}
        </button>
      </Section>

      {/* ── Customer Ordering Link ── */}
      <Section title="📱 Customer Ordering Link">
        <CustomerOrderLink restaurantName={restaurantName} />
      </Section>

      {/* Demo Credentials */}
      <Section title="🔑 Login Credentials">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { role: 'Admin', email: 'admin@aurumdining.com', pass: 'admin123', icon: '👑' },
            { role: 'Manager', email: 'manager@aurumdining.com', pass: 'manager123', icon: '📋' },
            { role: 'Waiter', email: 'waiter@aurumdining.com', pass: 'waiter123', icon: '🍽️' },
            { role: 'Chef', email: 'chef@aurumdining.com', pass: 'chef123', icon: '👨‍🍳' },
            { role: 'Driver', email: 'driver@aurumdining.com', pass: 'driver123', icon: '🛵' },
          ].map(({ role, email, pass, icon }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{role}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{email} / {pass}</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(email); showModal('success', 'Copied!', `${email} copied to clipboard.`); }}
                style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--border)', color: 'var(--gold)', cursor: 'pointer', fontSize: '11px' }}>
                Copy
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
          Run <code style={{ fontFamily: '"JetBrains Mono",monospace', color: 'var(--gold)' }}>npm run seed</code> in the server folder to reset demo data.
        </p>
      </Section>
    </div>
  );
}
