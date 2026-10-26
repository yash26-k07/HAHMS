import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { StatusBadge } from '../components/StatCard';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    api.get('/appointments').then(setAppointments).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    api.get('/doctors').then(setDoctors).catch(() => {});
    if (user.role !== 'patient') {
      api.get('/patients').then(setPatients).catch(() => {});
    }
  }, [user.role]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const payload = { ...form };
      // Patients booking for themselves: use patient_id from their auth profile
      if (user.role === 'patient') {
        if (user.patient_id) {
          payload.patient_id = user.patient_id;
        } else {
          // Fallback: look up patient_id if not in the auth context (legacy tokens)
          const me = await api.get('/auth/me');
          payload.patient_id = me.profile?.patient_id;
        }
      }
      await api.post('/appointments', payload);
      setNotice('Appointment booked successfully.');
      setForm({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    setError('');
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancel(id) {
    setError('');
    try {
      await api.delete(`/appointments/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const canManageStatus = ['admin', 'receptionist', 'doctor'].includes(user.role);

  return (
    <Layout title={user.role === 'patient' ? 'My Appointments' : 'Appointments'}>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="card">
        <div className="section-title">
          <h3>{user.role === 'patient' ? 'Book a New Appointment' : 'All Appointments'}</h3>
          {['admin', 'receptionist', 'patient'].includes(user.role) && (
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ Book Appointment'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {user.role !== 'patient' && (
              <div className="field"><label>Patient</label>
                <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.patient_id} value={p.patient_id}>{p.name} — {p.contact}</option>)}
                </select></div>
            )}
            <div className="field"><label>Doctor</label>
              <select required value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                <option value="">Select doctor…</option>
                {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.department_name}</option>)}
              </select></div>
            <div className="form-row">
              <div className="field"><label>Date</label>
                <input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></div>
              <div className="field"><label>Time</label>
                <input type="time" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
            </div>
            <div className="field"><label>Reason for visit</label>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <button className="btn" type="submit">Confirm Booking</button>
          </form>
        )}

        {appointments.length === 0 ? (
          <div className="empty-state">No appointments found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.appointment_id}>
                  <td>{a.appointment_date}</td>
                  <td>{a.appointment_time}</td>
                  <td>{a.patient_name}</td>
                  <td>{a.doctor_name}</td>
                  <td>{a.department_name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {canManageStatus && a.status !== 'cancelled' && a.status !== 'completed' && (
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(a.appointment_id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button className="btn coral" style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => cancel(a.appointment_id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
