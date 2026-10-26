import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyRx = { medicine: '', dosage: '', duration: '', instructions: '' };

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', appointment_id: '', visit_date: '', diagnosis: '', notes: '', follow_up_date: '' });
  const [prescriptions, setPrescriptions] = useState([{ ...emptyRx }]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    api.get('/medical-records').then(setRecords).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    if (user.role === 'doctor') {
      api.get('/appointments?status=confirmed').then(setAppointments).catch(() => {});
    }
  }, [user.role]);

  function pickAppointment(id) {
    const appt = appointments.find((a) => String(a.appointment_id) === id);
    setForm({
      ...form,
      appointment_id: id,
      patient_id: appt ? appt.patient_id : '',
      visit_date: appt ? appt.appointment_date : '',
    });
  }

  function updateRx(idx, field, value) {
    const next = [...prescriptions];
    next[idx] = { ...next[idx], [field]: value };
    setPrescriptions(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api.post('/medical-records', {
        ...form,
        prescriptions: prescriptions.filter((r) => r.medicine.trim()),
      });
      setNotice('Medical record saved.');
      setForm({ patient_id: '', appointment_id: '', visit_date: '', diagnosis: '', notes: '', follow_up_date: '' });
      setPrescriptions([{ ...emptyRx }]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title={user.role === 'patient' ? 'My Medical Records' : 'Medical Records'}>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {user.role === 'doctor' && (
        <div className="card">
          <div className="section-title">
            <h3>Record a Consultation</h3>
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ New Record'}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="field"><label>Appointment</label>
                <select required value={form.appointment_id} onChange={(e) => pickAppointment(e.target.value)}>
                  <option value="">Select a confirmed appointment…</option>
                  {appointments.map((a) => (
                    <option key={a.appointment_id} value={a.appointment_id}>
                      {a.patient_name} — {a.appointment_date} {a.appointment_time}
                    </option>
                  ))}
                </select></div>
              <div className="field"><label>Diagnosis</label>
                <textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
              <div className="field"><label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="field"><label>Follow-up date (optional)</label>
                <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Prescriptions</label>
              {prescriptions.map((rx, idx) => (
                <div className="form-row" key={idx} style={{ marginTop: 8 }}>
                  <input placeholder="Medicine" value={rx.medicine} onChange={(e) => updateRx(idx, 'medicine', e.target.value)} />
                  <input placeholder="Dosage" value={rx.dosage} onChange={(e) => updateRx(idx, 'dosage', e.target.value)} />
                  <input placeholder="Duration" value={rx.duration} onChange={(e) => updateRx(idx, 'duration', e.target.value)} />
                </div>
              ))}
              <button type="button" className="btn secondary" style={{ marginTop: 10, marginBottom: 14 }}
                onClick={() => setPrescriptions([...prescriptions, { ...emptyRx }])}>+ Add medicine</button>
              <br />
              <button className="btn" type="submit">Save Medical Record</button>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-title"><h3>{user.role === 'patient' ? 'Visit History' : 'Records'}</h3></div>
        {records.length === 0 ? (
          <div className="empty-state">No medical records yet.</div>
        ) : (
          <table>
            <thead><tr><th>Visit Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Follow-up</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.record_id}>
                  <td>{r.visit_date}</td><td>{r.patient_name}</td><td>{r.doctor_name}</td>
                  <td>{r.diagnosis || '—'}</td><td>{r.follow_up_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
