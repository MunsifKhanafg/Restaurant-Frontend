import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchOverview, fetchDailyChart } from '../store/slices/analyticsSlice';
import { fetchStockAlerts } from '../store/slices/productSlice';
import { fetchKitchenOrders } from '../store/slices/orderSlice';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/helpers';

const StatCard = ({ label, value, sub, icon, color = 'var(--gold)', link }) => (
  <div className="stat-card animate-fadeInUp" style={{ cursor: link ? 'pointer' : 'default' }}
    onClick={() => link && (window.location.href = link)}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600' }}>{label}</span>
      <span style={{ fontSize: '20px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '26px', fontFamily: '"Cormorant Garamond", serif', fontWeight: '600', color, marginBottom: '4px' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { overview } = useSelector((s) => s.analytics);
  const dailyChart = useSelector((s) => s.analytics.dailyChart);
  const stockAlerts = useSelector((s) => s.products.stockAlerts);
  const kitchenOrders = useSelector((s) => s.orders.kitchenOrders);

  useEffect(() => {
    dispatch(fetchOverview());
    dispatch(fetchDailyChart({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }));
    dispatch(fetchStockAlerts());
    dispatch(fetchKitchenOrders());
  }, [dispatch]);

  const chartData = dailyChart.map(d => ({
    day: `${d._id}`,
    sales: d.sales,
    orders: d.orders,
  }));

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Today's Sales" value={formatCurrency(overview?.daily?.sales || 0)} sub={`${overview?.daily?.orders || 0} orders`} icon="💰" />
        <StatCard label="Monthly Sales" value={formatCurrency(overview?.monthly?.sales || 0)} sub={`${overview?.monthly?.orders || 0} orders`} icon="📅" />
        <StatCard label="Yearly Sales" value={formatCurrency(overview?.yearly?.sales || 0)} sub={`${overview?.yearly?.orders || 0} orders`} icon="📈" />
        <StatCard label="Pending Orders" value={overview?.pendingOrders || 0} sub="In kitchen / processing" icon="⏳" color="var(--orange)" link="/kitchen" />
        <StatCard label="Stock Alerts" value={stockAlerts.length} sub="Low / finished items" icon="⚠️" color={stockAlerts.length > 0 ? 'var(--red)' : 'var(--green)'} link="/inventory" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Area Chart */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '2px' }}>
              Monthly Revenue
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No sales data yet for this month
            </div>
          )}
        </div>

        {/* Kitchen Queue */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: 'var(--text-primary)' }}>Kitchen Queue</h3>
            <Link to="/kitchen" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>View All →</Link>
          </div>
          {kitchenOrders.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No active orders 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '200px' }}>
              {kitchenOrders.slice(0, 6).map((order) => (
                <div key={order._id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", monospace' }}>{order.billId}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : order.orderType}
                    </div>
                  </div>
                  <span className={`badge ${order.orderStatus === 'preparing' ? 'badge-orange' : 'badge-blue'}`}>
                    {order.orderStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: 'var(--red)' }}>
              ⚠️ Stock Alerts
            </h3>
            <Link to="/inventory" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {stockAlerts.map((p) => (
              <div key={p._id} style={{ padding: '10px 14px', borderRadius: '8px', background: p.stockStatus === 'finished' ? 'rgba(224,82,82,0.08)' : 'rgba(224,123,57,0.08)', border: `1px solid ${p.stockStatus === 'finished' ? 'rgba(224,82,82,0.3)' : 'rgba(224,123,57,0.3)'}` }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: p.stockStatus === 'finished' ? 'var(--red)' : 'var(--orange)' }}>
                  {p.stockStatus === 'finished' ? 'Out of Stock' : `Low: ${p.currentStock} left`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'New Order', icon: '🧾', link: '/pos', color: 'btn-gold' },
            { label: 'View Kitchen', icon: '👨‍🍳', link: '/kitchen', color: 'btn-outline-gold' },
            { label: 'All Orders', icon: '📋', link: '/orders', color: 'btn-outline-gold' },
            { label: 'Analytics', icon: '📊', link: '/analytics', color: 'btn-outline-gold' },
          ].map(({ label, icon, link, color }) => (
            <Link key={link} to={link} className={color} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {icon} {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
