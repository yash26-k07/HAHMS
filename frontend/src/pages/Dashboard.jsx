import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { StatCard, StatusBadge } from '../components/StatCard';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/reports/summary').then(setSummary).catch((e) => setError(e.message));
    }
    api.get('/appointments').then(setAppointments).catch((e) => setError(e.message));
  }, [user.role]);

  const upcoming = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status));
  const completed = appointments.filter(a => a.status === 'completed');
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.appointment_date === today);

  return (
    <Layout title="Dashboard">
      {error && <div className="alert error">{error}</div>}

      {/* --- Patient Dashboard --- */}
      {user.role === 'patient' && (
        <>
          <div className="welcome-hero">
            <div className="welcome-hero-text">
              <h2>Welcome back, {user.name?.split(' ')[0]} 👋</h2>
              <p>Here's an overview of your health journey at Meridian Health.</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <StatCard label="Upcoming Appointments" value={upcoming.length} />
            <StatCard label="Completed Visits" value={completed.length} />
            <StatCard label="Today's Appointments" value={todayAppts.length} />
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="section-title"><h3>📅 Upcoming Appointments</h3></div>
              {upcoming.length === 0 ? (
                <div className="empty-state">No upcoming appointments. Book one from the Appointments page!</div>
              ) : (
                <div className="appt-list">
                  {upcoming.slice(0, 5).map((a) => (
                    <div key={a.appointment_id} className="appt-item">
                      <div className="appt-item-icon">🩺</div>
                      <div className="appt-item-info">
                        <strong>{a.doctor_name}</strong>
                        <span className="muted">{a.department_name}</span>
                      </div>
                      <div className="appt-item-meta">
                        <span>{a.appointment_date}</span>
                        <span className="muted">{a.appointment_time}</span>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-title"><h3>🕐 Recent Visits</h3></div>
              {completed.length === 0 ? (
                <div className="empty-state">No completed visits yet.</div>
              ) : (
                <div className="appt-list">
                  {completed.slice(0, 5).map((a) => (
                    <div key={a.appointment_id} className="appt-item">
                      <div className="appt-item-icon">✅</div>
                      <div className="appt-item-info">
                        <strong>{a.doctor_name}</strong>
                        <span className="muted">{a.reason || 'General visit'}</span>
                      </div>
                      <div className="appt-item-meta">
                        <span>{a.appointment_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card quick-actions-card" style={{ marginTop: 20 }}>
            <div className="section-title"><h3>⚡ Quick Actions</h3></div>
            <div className="quick-actions">
              <a href="/appointments" className="quick-action-btn">
                <span className="qa-icon">📅</span>
                <span className="qa-label">Book Appointment</span>
              </a>
              <a href="/medical-records" className="quick-action-btn">
                <span className="qa-icon">📋</span>
                <span className="qa-label">View Records</span>
              </a>
              <a href="/billing" className="quick-action-btn">
                <span className="qa-icon">💳</span>
                <span className="qa-label">My Bills</span>
              </a>
              <a href="/profile" className="quick-action-btn">
                <span className="qa-icon">👤</span>
                <span className="qa-label">My Profile</span>
              </a>
            </div>
          </div>
        </>
      )}

      {/* --- Doctor Dashboard --- */}
      {user.role === 'doctor' && (
        <>
          <div className="welcome-hero">
            <div className="welcome-hero-text">
              <h2>Welcome, Dr. {user.name?.split(' ').pop()} 🩺</h2>
              <p>Manage your appointments and patient records.</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <StatCard label="Today's Appointments" value={todayAppts.length} />
            <StatCard label="Upcoming" value={upcoming.length} />
            <StatCard label="Completed" value={completed.length} />
          </div>

          <div className="card">
            <div className="section-title"><h3>Today's Schedule</h3></div>
            {todayAppts.length === 0 ? (
              <div className="empty-state">No appointments today. Enjoy your day! 🎉</div>
            ) : (
              <table>
                <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {todayAppts.map((a) => (
                    <tr key={a.appointment_id}>
                      <td><strong>{a.appointment_time}</strong></td>
                      <td>{a.patient_name}</td>
                      <td>{a.reason || '—'}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <div className="section-title"><h3>All Upcoming Appointments</h3></div>
            {upcoming.length === 0 ? (
              <div className="empty-state">No upcoming appointments.</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {upcoming.map((a) => (
                    <tr key={a.appointment_id}>
                      <td>{a.appointment_date}</td>
                      <td>{a.appointment_time}</td>
                      <td>{a.patient_name}</td>
                      <td>{a.reason || '—'}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* --- Admin Dashboard --- */}
      {user.role === 'admin' && summary && (
        <>
          <div className="grid grid-4">
            <StatCard label="Total Patients" value={summary.total_patients} />
            <StatCard label="Total Doctors" value={summary.total_doctors} />
            <StatCard label="Appointments Today" value={summary.appointments_today} />
            <StatCard label="Currently Admitted" value={summary.admitted_now} />
          </div>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <StatCard label="Revenue This Month" value={`₹${Number(summary.revenue_this_month).toLocaleString()}`} />
            <StatCard label="Pending Payments" value={`₹${Number(summary.pending_amount).toLocaleString()}`} />
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title"><h3>Appointments by Department (30 days)</h3></div>
            {summary.appointments_by_department.length === 0 ? (
              <p className="muted">No appointment activity in the last 30 days.</p>
            ) : (
              <table>
                <thead><tr><th>Department</th><th>Appointments</th></tr></thead>
                <tbody>
                  {summary.appointments_by_department.map((d) => (
                    <tr key={d.department}><td>{d.department}</td><td>{d.appointment_count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {summary.low_stock_items.length > 0 && (
            <div className="card">
              <div className="section-title"><h3>⚠️ Low Stock Alerts</h3></div>
              <table>
                <thead><tr><th>Item</th><th>Quantity</th><th>Reorder Level</th></tr></thead>
                <tbody>
                  {summary.low_stock_items.map((i) => (
                    <tr key={i.item_id}>
                      <td>{i.name}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{i.quantity}</td>
                      <td>{i.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* --- Receptionist Dashboard --- */}
      {user.role === 'receptionist' && (
        <>
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <StatCard label="Today's Appointments" value={todayAppts.length} />
            <StatCard label="Upcoming" value={upcoming.length} />
            <StatCard label="Total Appointments" value={appointments.length} />
          </div>

          <div className="card">
            <div className="section-title"><h3>Recent Appointments</h3></div>
            {appointments.length === 0 ? (
              <div className="empty-state">No appointments to show yet.</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
                <tbody>
                  {appointments.slice(0, 10).map((a) => (
                    <tr key={a.appointment_id}>
                      <td>{a.appointment_date}</td><td>{a.appointment_time}</td>
                      <td>{a.patient_name}</td><td>{a.doctor_name}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
