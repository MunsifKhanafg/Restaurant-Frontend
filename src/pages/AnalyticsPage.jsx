import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOverview, fetchProfit, fetchDailyChart } from '../store/slices/analyticsSlice';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid, ReferenceLine
} from 'recharts';
import { formatCurrency } from '../utils/helpers';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#D4AF37','#4A9ECA','#E07B39','#4CAF7D','#E05252','#8B6914'];

// ── Custom Tooltip for Revenue chart ──
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: '10px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: '160px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Day {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: p.color }}>
            {p.dataKey === 'orders' ? p.value : formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Tiny stat trend card ──
const StatBlock = ({ label, val, sub, icon, color }) => (
  <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{label}</span>
      <span style={{ fontSize: '20px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '20px', fontFamily: '"Cormorant Garamond", serif', fontWeight: '700', color }}>{val}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
  </div>
);

const RoundedBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(4, height / 2);
  return (
    <path
      d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={fill} />
  );
};

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const { overview, profit, dailyChart } = useSelector((s) => s.analytics);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [chartView, setChartView] = useState('combo');

  useEffect(() => {
    dispatch(fetchOverview());
    dispatch(fetchProfit({ month, year }));
    dispatch(fetchDailyChart({ month, year }));
  }, [dispatch, month, year]);

  const chartData = dailyChart.map(d => ({ day: d._id, sales: d.sales, orders: d.orders }));
  const maxSales = Math.max(...chartData.map(d => d.sales), 1);
  const avgSales = chartData.length ? chartData.reduce((s, d) => s + d.sales, 0) / chartData.length : 0;
  const pieData = profit?.expenseBreakdown?.map(e => ({ name: e._id || 'Other', value: e.total })) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Analytics</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sales performance & profit overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select className="select-dark" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select-dark" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
        {[
          { label: "Today's Revenue", val: formatCurrency(overview?.daily?.sales || 0), sub: `${overview?.daily?.orders || 0} orders`, icon: '💰', color: 'var(--gold)' },
          { label: 'Monthly Revenue', val: formatCurrency(overview?.monthly?.sales || 0), sub: `${overview?.monthly?.orders || 0} orders`, icon: '📅', color: 'var(--green)' },
          { label: 'Yearly Revenue', val: formatCurrency(overview?.yearly?.sales || 0), sub: `${overview?.yearly?.orders || 0} orders`, icon: '📈', color: 'var(--blue)' },
          { label: 'Pending Orders', val: overview?.pendingOrders || 0, sub: 'In kitchen', icon: '⏳', color: 'var(--orange)' },
        ].map(({ label, val, sub, icon, color }) => (
          <div key={label} className="stat-card" style={{ padding: '20px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
              <span>{icon}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '600', color }}>{val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Profit Engine */}
      {profit && (
        <div className="glass-card" style={{ padding: '22px' }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', marginBottom: '16px' }}>Profit Engine</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
             <StatBlock label="Total Sales" val={formatCurrency(profit.totalSales)} color="var(--green)" icon="📈" />
             <StatBlock label="Total Expenses" val={formatCurrency(profit.totalExpenses)} color="var(--orange)" icon="💸" />
             <StatBlock label="Staff Salaries" val={formatCurrency(profit.totalSalary)} color="var(--blue)" icon="👥" />
             <StatBlock label="Net Profit" val={formatCurrency(profit.netProfit)} color={profit.netProfit >= 0 ? 'var(--green)' : 'var(--red)'} icon="✅" />
          </div>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px' }}>Monthly Revenue</h3>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '3px' }}>
            {['combo', 'area', 'bar'].map(view => (
              <button key={view} onClick={() => setChartView(view)} style={{ padding: '5px 12px', cursor: 'pointer', background: chartView === view ? 'var(--gold)' : 'transparent' }}>
                {view.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <Tooltip content={<RevenueTooltip />} />
            {chartView === 'combo' && (
              <>
                <Area yAxisId="left" type="monotone" dataKey="sales" fill="rgba(212,175,55,0.2)" stroke="#D4AF37" />
                <Bar yAxisId="left" dataKey="orders" fill="#4A9ECA" shape={<RoundedBar />} />
              </>
            )}
            {chartView === 'area' && <Area yAxisId="left" type="monotone" dataKey="sales" fill="rgba(212,175,55,0.2)" stroke="#D4AF37" />}
            {chartView === 'bar' && <Bar yAxisId="left" dataKey="sales" fill="#D4AF37" shape={<RoundedBar />} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3>Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">
                {pieData.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}