import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useModal } from '../components/common/AppModal';

const DEPARTMENTS = ['Kitchen', 'Service', 'Management', 'Delivery', 'Accounts', 'Maintenance'];
const DESIGNATIONS = ['Head Chef', 'Sous Chef', 'Line Cook', 'Waiter', 'Senior Waiter', 'Manager', 'Assistant Manager', 'Delivery Driver', 'Cashier', 'Dishwasher', 'Maintenance Staff', 'Accountant'];
const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'half-day'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DEPT_GROUPS = [
  { label: 'All Staff', key: 'all', icon: '👥' },
  { label: 'Kitchen / Cooks', key: 'Kitchen', icon: '🍳' },
  { label: 'Waiters', key: 'Service', icon: '🧑‍🍽️' },
  { label: 'Management', key: 'Management', icon: '🏢' },
  { label: 'Maintenance', key: 'Maintenance', icon: '🔧' },
  { label: 'Delivery', key: 'Delivery', icon: '🛵' },
  { label: 'Accounts', key: 'Accounts', icon: '📊' },
];

const BLANK_FORM = {
  name: '', role: 'waiter', phone: '',
  designation: 'Waiter', department: 'Service', baseSalary: '',
  joiningDate: new Date().toISOString().split('T')[0],
  emergencyContact: '', address: '', dutyStartTime: '09:00', dutyEndTime: '18:00',
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('staff');
  const [deptFilter, setDeptFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [workingDays, setWorkingDays] = useState(26);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const showModal = useModal();
  const [form, setForm] = useState(BLANK_FORM);
  const [attForm, setAttForm] = useState({
    date: new Date().toISOString().split('T')[0], status: 'present',
    checkIn: '09:00', checkOut: '18:00', notes: '',
  });
  const [salaryForm, setSalaryForm] = useState({
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    baseSalary: '', bonus: '0', deductions: '0', workingDaysInMonth: '26', paid: false,
  });
  const [salaryPreview, setSalaryPreview] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/staff');
      setStaff(data.data);
    } catch { showModal('error', 'Load Failed', 'Failed to load staff members. Please refresh.'); }
    finally { setLoading(false); }
  };

  const loadMonthlySummary = async () => {
    try {
      setSummaryLoading(true);
      const { data } = await api.get(`/staff/salary/monthly?month=${summaryMonth}&year=${summaryYear}&workingDaysInMonth=${workingDays}`);
      setMonthlySummary(data.data);
    } catch { showModal('error', 'Load Failed', 'Failed to load salary summary. Please try again.'); }
    finally { setSummaryLoading(false); }
  };

  useEffect(() => { loadStaff(); }, []);
  useEffect(() => { if (tab === 'monthly') loadMonthlySummary(); }, [tab, summaryMonth, summaryYear, workingDays]);

  const handleRemoveStaff = async () => {
    if (!removeConfirm) return;
    setRemovingId(removeConfirm.member._id);
    try {
      await api.delete(`/staff/${removeConfirm.member._id}`);
      showModal('success', 'Staff Removed', `${removeConfirm.member.user?.name || 'Staff member'} has been removed from the system.`);
      setRemoveConfirm(null);
      loadStaff();
    } catch (err) {
      showModal('error', 'Remove Failed', err.response?.data?.message || 'Failed to remove staff member. Please try again.');
    }
    setRemovingId(null);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showModal('error', 'Name Required', 'Please enter the staff member\'s full name.'); return; }
    if (!form.baseSalary || parseFloat(form.baseSalary) <= 0) { showModal('error', 'Salary Required', 'Please enter a valid base salary greater than zero.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(), role: form.role, phone: form.phone,
        designation: form.designation, department: form.department,
        baseSalary: parseFloat(form.baseSalary), joiningDate: form.joiningDate,
        emergencyContact: form.emergencyContact, address: form.address,
        dutyStartTime: form.dutyStartTime, dutyEndTime: form.dutyEndTime,
      };
      await api.post('/staff', payload);
      showModal('success', 'Staff Added', `${form.name} has been added to the system successfully.`);
      setModal(null);
      setForm(BLANK_FORM);
      loadStaff();
    } catch (err) {
      showModal('error', 'Add Failed', err.response?.data?.message || 'Failed to add staff member. Please try again.');
    }
    setSubmitting(false);
  };

  const handleAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/staff/${selectedStaff._id}/attendance`, attForm);
      showModal('success', 'Attendance Saved', `Attendance recorded for ${selectedStaff.user?.name || 'staff member'} — status: ${attForm.status}.`);
      setModal(null);
      loadStaff();
    } catch { showModal('error', 'Save Failed', 'Failed to record attendance. Please try again.'); }
  };

  const handleSalary = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/staff/${selectedStaff._id}/salary`, salaryForm);
      showModal('success', 'Salary Recorded', `Salary saved! Absent days: ${res.data.absentDays}. Absent deduction: ${formatCurrency(res.data.absentDeduction)}.`);
      setModal(null);
      loadStaff();
    } catch { showModal('error', 'Save Failed', 'Failed to record salary. Please try again.'); }
  };

  const computePreview = () => {
    const base = parseFloat(salaryForm.baseSalary) || 0;
    const bonus = parseFloat(salaryForm.bonus) || 0;
    const manualDed = parseFloat(salaryForm.deductions) || 0;
    const days = parseInt(salaryForm.workingDaysInMonth) || 26;
    if (!selectedStaff || !base) return setSalaryPreview(null);
    const absentCount = selectedStaff.attendance?.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() + 1 === parseInt(salaryForm.month) && d.getFullYear() === parseInt(salaryForm.year) && a.status === 'absent';
    }).length || 0;
    const absentDed = parseFloat(((base / days) * absentCount).toFixed(2));
    setSalaryPreview({ absentCount, absentDed, net: base + bonus - manualDed - absentDed });
  };

  useEffect(() => { computePreview(); }, [salaryForm, selectedStaff]);

  const getDeptColor = (dept) => {
    const map = {
      Kitchen: 'var(--orange)', Service: 'var(--blue)', Management: 'var(--gold)',
      Delivery: 'var(--green)', Accounts: 'var(--text-secondary)', Maintenance: '#a78bfa',
    };
    return map[dept] || 'var(--text-muted)';
  };

  const getTodayAtt = (member) => {
    const today = new Date().toISOString().split('T')[0];
    return member.attendance?.find(a => a.date?.startsWith(today));
  };

  const filteredStaff = deptFilter === 'all' ? staff : staff.filter(s => s.department === deptFilter);
  const totalSalary = staff.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
  const activeCount = staff.filter(s => s.isActive).length;
  const deptCounts = DEPARTMENTS.reduce((acc, d) => ({ ...acc, [d]: staff.filter(s => s.department === d).length }), {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* REMOVE CONFIRM MODAL */}
      {removeConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: '#ef4444', marginBottom: '10px' }}>Remove Staff Member?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>
              You are about to permanently remove <strong style={{ color: 'var(--text-primary)' }}>{removeConfirm.member.user?.name}</strong> ({removeConfirm.member.designation} · {removeConfirm.member.department}) from the system.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              This action cannot be undone. All their attendance and salary records will also be deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setRemoveConfirm(null)} className="btn-outline-gold" style={{ flex: 1, padding: '11px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleRemoveStaff} disabled={!!removingId}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: removingId ? 'not-allowed' : 'pointer', border: 'none',
                  background: removingId ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.85)', color: '#fff', opacity: removingId ? 0.7 : 1 }}>
                {removingId ? 'Removing...' : '🗑️ Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '2px' }}>Staff & HR</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activeCount} active staff members</p>
        </div>
        <button className="btn-gold" onClick={() => setModal('add')} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>
          + Add Staff
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'Total Staff', val: staff.length, icon: '👥', color: 'var(--gold)' },
          { label: 'Kitchen Staff', val: deptCounts['Kitchen'] || 0, icon: '🍳', color: 'var(--orange)' },
          { label: 'Waiters', val: deptCounts['Service'] || 0, icon: '🧑‍🍽️', color: 'var(--blue)' },
          { label: 'Monthly Payroll', val: formatCurrency(totalSalary), icon: '💰', color: 'var(--green)' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{label}</span>
              <span>{icon}</span>
            </div>
            <div style={{ fontSize: '20px', fontFamily: '"Cormorant Garamond", serif', fontWeight: '600', color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-surface)', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[
          ['staff', '👥 Staff List'],
          ['attendance', '📋 Attendance'],
          ['monthly', '💰 Monthly Salary'],
          ['kitchen', '🍳 Kitchen Team'],
        ].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '7px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: tab === t ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'transparent',
              color: tab === t ? '#0D0D0D' : 'var(--text-secondary)',
            }}>{l}</button>
        ))}
      </div>

      {/* STAFF LIST TAB */}
      {tab === 'staff' && (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DEPT_GROUPS.map(({ label, key, icon }) => (
              <button key={key} onClick={() => setDeptFilter(key)}
                style={{
                  padding: '5px 14px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                  background: deptFilter === key ? 'linear-gradient(135deg,#D4AF37,#B8960C)' : 'var(--bg-surface)',
                  color: deptFilter === key ? '#0D0D0D' : 'var(--text-secondary)',
                  border: deptFilter === key ? 'none' : '1px solid var(--border)',
                }}>
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff...</div>
            ) : filteredStaff.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No staff in this category yet.</p>
                <button className="btn-gold" onClick={() => setModal('add')} style={{ marginTop: '14px', padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>+ Add First Staff Member</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Employee</th><th>ID</th><th>Designation</th><th>Department</th>
                      <th>Duty Timing</th><th>Salary</th><th>Joined</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map(member => (
                      <tr key={member._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `linear-gradient(135deg,${getDeptColor(member.department)},#333)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff', fontSize: '13px', flexShrink: 0 }}>
                              {(member.user?.name || member.designation)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{member.user?.name || '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user?.phone || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: 'var(--gold)' }}>{member.employeeId}</span></td>
                        <td style={{ fontSize: '12px' }}>{member.designation}</td>
                        <td><span style={{ color: getDeptColor(member.department), fontSize: '12px', fontWeight: '600' }}>{member.department}</span></td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            🕐 {member.dutyStartTime || '—'} – {member.dutyEndTime || '—'}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--gold)' }}>{formatCurrency(member.baseSalary)}</td>
                        <td style={{ fontSize: '12px' }}>{formatDate(member.joiningDate)}</td>
                        <td><span className={`badge ${member.isActive ? 'badge-green' : 'badge-gray'}`}>{member.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setSelectedStaff(member); setAttForm(f => ({ ...f, checkIn: member.dutyStartTime || '09:00', checkOut: member.dutyEndTime || '18:00' })); setModal('attendance'); }}
                              className="btn-outline-gold" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>Att.</button>
                            <button onClick={() => { setSelectedStaff(member); setSalaryForm(f => ({ ...f, baseSalary: member.baseSalary })); setModal('salary'); }}
                              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', color: 'var(--green)', cursor: 'pointer' }}>Salary</button>
                            <button onClick={() => setRemoveConfirm({ member })} disabled={removingId === member._id}
                              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>
                              🗑️ Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ATTENDANCE TAB */}
      {tab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
          {staff.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No staff added yet. Add staff first to track attendance.</p>
              <button className="btn-gold" onClick={() => setModal('add')} style={{ marginTop: '14px', padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>+ Add Staff</button>
            </div>
          )}
          {staff.map(member => {
            const todayAtt = getTodayAtt(member);
            const attColors = { present: 'var(--green)', absent: '#ef4444', late: 'var(--orange)', 'half-day': 'var(--blue)' };
            const thisMonthAbsent = member.attendance?.filter(a => {
              const d = new Date(a.date);
              return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear() && a.status === 'absent';
            }).length || 0;
            return (
              <div key={member._id} className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{member.user?.name || member.designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.designation} · {member.department}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>🕐 {member.dutyStartTime || '--:--'} – {member.dutyEndTime || '--:--'}</div>
                  </div>
                  {todayAtt ? (
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'capitalize', padding: '3px 10px', borderRadius: '999px', background: `${attColors[todayAtt.status]}22`, color: attColors[todayAtt.status], border: `1px solid ${attColors[todayAtt.status]}44` }}>
                      {todayAtt.status}
                    </span>
                  ) : <span className="badge badge-gray">Not Marked</span>}
                </div>
                {thisMonthAbsent > 0 && (
                  <div style={{ fontSize: '11px', marginBottom: '8px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    ⚠️ {thisMonthAbsent} absent day{thisMonthAbsent > 1 ? 's' : ''} this month
                    <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                      (≈ {formatCurrency((member.baseSalary / 26) * thisMonthAbsent)} deduction)
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setSelectedStaff(member); setAttForm(f => ({ ...f, checkIn: member.dutyStartTime || '09:00', checkOut: member.dutyEndTime || '18:00' })); setModal('attendance'); }}
                    className="btn-outline-gold" style={{ flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12px' }}>
                    {todayAtt ? 'Update Attendance' : 'Mark Attendance'}
                  </button>
                  <button onClick={() => setRemoveConfirm({ member })}
                    style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONTHLY SALARY SUMMARY TAB */}
      {tab === 'monthly' && (
        <>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { label: 'Month', child: <select className="select-dark" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '13px' }}>
                {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select> },
              { label: 'Year', child: <input type="number" className="input-dark" value={summaryYear} onChange={e => setSummaryYear(e.target.value)} style={{ width: '90px', padding: '7px 10px', borderRadius: '6px', fontSize: '13px' }} /> },
              { label: 'Working Days/Month', child: <input type="number" className="input-dark" value={workingDays} min={20} max={31} onChange={e => setWorkingDays(e.target.value)} style={{ width: '70px', padding: '7px 10px', borderRadius: '6px', fontSize: '13px' }} /> },
            ].map(({ label, child }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                {child}
              </div>
            ))}
            <button className="btn-gold" onClick={loadMonthlySummary} style={{ padding: '8px 20px', borderRadius: '7px', fontSize: '13px' }}>Refresh</button>
          </div>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {summaryLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating salaries...</div>
            ) : monthlySummary.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No staff salary data for this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Employee</th><th>Department</th><th>Duty Time</th><th>Base Salary</th>
                      <th>Absent Days</th><th>Absent Deduction</th><th>Est. Net Salary</th>
                      <th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.map(member => (
                      <tr key={member._id}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{member.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.designation}</div>
                        </td>
                        <td><span style={{ color: getDeptColor(member.department), fontSize: '12px', fontWeight: '600' }}>{member.department}</span></td>
                        <td><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.dutyStartTime} – {member.dutyEndTime}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(member.baseSalary)}</td>
                        <td>{member.absentDays > 0 ? <span style={{ color: '#ef4444', fontWeight: '700' }}>{member.absentDays} day{member.absentDays > 1 ? 's' : ''}</span> : <span style={{ color: 'var(--green)' }}>0</span>}</td>
                        <td>{member.absentDeduction > 0 ? <span style={{ color: '#ef4444', fontWeight: '600' }}>- {formatCurrency(member.absentDeduction)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ fontWeight: '700', color: 'var(--gold)', fontSize: '14px' }}>{formatCurrency(member.estimatedNet)}</td>
                        <td>
                          {member.recorded ? (
                            <span className={`badge ${member.recorded.paid ? 'badge-green' : 'badge-orange'}`}>{member.recorded.paid ? '✅ Paid' : '⏳ Pending'}</span>
                          ) : <span className="badge badge-gray">Not Recorded</span>}
                        </td>
                        <td>
                          <button onClick={() => {
                            const sm = staff.find(s => s._id === member._id);
                            if (sm) { setSelectedStaff(sm); setSalaryForm(f => ({ ...f, baseSalary: member.baseSalary, month: summaryMonth, year: summaryYear, workingDaysInMonth: workingDays })); setModal('salary'); }
                          }} className="btn-outline-gold" style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px' }}>Record</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {monthlySummary.length > 0 && (
                  <div style={{ padding: '12px 20px', background: 'rgba(212,175,55,0.05)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Total Payroll ({MONTHS[summaryMonth]} {summaryYear})</span>
                    <span style={{ color: 'var(--gold)', fontWeight: '700', fontSize: '15px' }}>{formatCurrency(monthlySummary.reduce((s, m) => s + m.estimatedNet, 0))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* KITCHEN TEAM TAB */}
      {tab === 'kitchen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>All kitchen / cook staff</p>
          {staff.filter(s => s.department === 'Kitchen').length === 0 ? (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍳</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No kitchen staff added yet.</p>
              <button className="btn-gold" onClick={() => { setForm({ ...BLANK_FORM, department: 'Kitchen', designation: 'Line Cook', role: 'chef' }); setModal('add'); }} style={{ marginTop: '14px', padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>+ Add Kitchen Staff</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '14px' }}>
              {staff.filter(s => s.department === 'Kitchen').map(member => {
                const thisMonthAbsent = member.attendance?.filter(a => {
                  const d = new Date(a.date);
                  return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear() && a.status === 'absent';
                }).length || 0;
                return (
                  <div key={member._id} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg,#f97316,#c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🍳</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{member.user?.name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: '600' }}>{member.designation}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.employeeId}</div>
                      </div>
                      <button onClick={() => setRemoveConfirm({ member })}
                        style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                      {[
                        { icon: '📅', label: 'Joined', val: formatDate(member.joiningDate) },
                        { icon: '💰', label: 'Monthly Salary', val: formatCurrency(member.baseSalary) },
                        { icon: '🕐', label: 'Shift Start', val: member.dutyStartTime || '—' },
                        { icon: '🕔', label: 'Shift End', val: member.dutyEndTime || '—' },
                        { icon: '📞', label: 'Phone', val: member.user?.phone || '—' },
                        { icon: '🔴', label: 'Absent This Month', val: thisMonthAbsent > 0 ? `${thisMonthAbsent} day(s) (- ${formatCurrency((member.baseSalary / 26) * thisMonthAbsent)})` : 'None' },
                      ].map(({ icon, label, val }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>{icon} {label}</div>
                          <div style={{ color: label === 'Monthly Salary' ? 'var(--gold)' : label === 'Absent This Month' && thisMonthAbsent > 0 ? '#ef4444' : 'var(--text-primary)', fontWeight: '600', fontSize: '11px' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <span className={`badge ${member.isActive ? 'badge-green' : 'badge-gray'}`}>{member.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {modal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '600px', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', color: 'var(--text-primary)' }}>Add Staff Member</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Name, Department & Salary are required.</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.12em', marginBottom: '10px' }}>✅ Required Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Full Name *</label>
                    <input required className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ali Hassan"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Department *</label>
                    <select required className="select-dark" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Designation *</label>
                    <select required className="select-dark" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                      {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Base Salary (Rs.) *</label>
                    <input required type="number" min="1" className="input-dark" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Role</label>
                    <select className="select-dark" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                      <option value="waiter">Waiter</option>
                      <option value="chef">Chef / Kitchen</option>
                      <option value="driver">Delivery Driver</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.12em', marginBottom: '10px' }}>📋 Optional Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Phone', key: 'phone', type: 'tel', placeholder: '03XX-XXXXXXX' },
                    { label: 'Joining Date', key: 'joiningDate', type: 'date', placeholder: '' },
                    { label: 'Duty Start', key: 'dutyStartTime', type: 'time', placeholder: '' },
                    { label: 'Duty End', key: 'dutyEndTime', type: 'time', placeholder: '' },
                    { label: 'Emergency Contact', key: 'emergencyContact', type: 'text', placeholder: 'Phone number' },
                    { label: 'Address', key: 'address', type: 'text', placeholder: 'Street, City' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                      <input type={type} className="input-dark" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn-outline-gold" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-gold" style={{ flex: 2, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  {submitting ? 'Adding...' : '✅ Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE MODAL */}
      {modal === 'attendance' && selectedStaff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '420px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', color: 'var(--text-primary)' }}>Mark Attendance</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedStaff.user?.name} · {selectedStaff.designation}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duty: {selectedStaff.dutyStartTime} – {selectedStaff.dutyEndTime}</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <form onSubmit={handleAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[{ label: 'Date', key: 'date', type: 'date' }, { label: 'Check In', key: 'checkIn', type: 'time' }, { label: 'Check Out', key: 'checkOut', type: 'time' }].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                  <input type={type} className="input-dark" value={attForm[key]} onChange={e => setAttForm({ ...attForm, [key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>Status</label>
                <select className="select-dark" value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                  {ATTENDANCE_STATUS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                </select>
              </div>
              {attForm.status === 'absent' && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '12px', color: '#ef4444' }}>
                  ⚠️ Marking absent will deduct <strong>{formatCurrency((selectedStaff.baseSalary / 26).toFixed(0))}</strong> from salary (1 day)
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-outline-gold" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY MODAL */}
      {modal === 'salary' && selectedStaff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-card-elevated" style={{ width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', color: 'var(--text-primary)' }}>Record Salary</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedStaff.user?.name} · {selectedStaff.designation}</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <form onSubmit={handleSalary} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Month', key: 'month', type: 'number', min: 1, max: 12 },
                  { label: 'Year', key: 'year', type: 'number', min: 2020 },
                  { label: 'Base Salary', key: 'baseSalary', type: 'number' },
                  { label: 'Bonus', key: 'bonus', type: 'number' },
                  { label: 'Other Deductions', key: 'deductions', type: 'number' },
                  { label: 'Working Days/Month', key: 'workingDaysInMonth', type: 'number', min: 20, max: 31 },
                ].map(({ label, key, type, min, max }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</label>
                    <input type={type} min={min} max={max} required={key === 'baseSalary'} className="input-dark" value={salaryForm[key]} onChange={e => setSalaryForm({ ...salaryForm, [key]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              {salaryPreview && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '12px' }}>
                  <div style={{ marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: '600' }}>Salary Breakdown</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: 'var(--text-muted)' }}>Base Salary</span><span>{formatCurrency(salaryForm.baseSalary)}</span></div>
                  {parseFloat(salaryForm.bonus) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: 'var(--text-muted)' }}>+ Bonus</span><span style={{ color: 'var(--green)' }}>+ {formatCurrency(salaryForm.bonus)}</span></div>}
                  {parseFloat(salaryForm.deductions) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: 'var(--text-muted)' }}>- Other Deductions</span><span style={{ color: '#ef4444' }}>- {formatCurrency(salaryForm.deductions)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#ef4444' }}>- Absent ({salaryPreview.absentCount} day{salaryPreview.absentCount !== 1 ? 's' : ''})</span><span style={{ color: '#ef4444' }}>- {formatCurrency(salaryPreview.absentDed)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)', fontWeight: '700' }}><span style={{ color: 'var(--text-primary)' }}>Net Salary</span><span style={{ color: 'var(--gold)', fontSize: '15px' }}>{formatCurrency(salaryPreview.net)}</span></div>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={salaryForm.paid} onChange={e => setSalaryForm({ ...salaryForm, paid: e.target.checked })} />
                Mark as Paid
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-outline-gold" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btn-gold" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Record Salary</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
