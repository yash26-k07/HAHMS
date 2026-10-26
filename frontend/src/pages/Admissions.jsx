import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { StatusBadge } from '../components/StatCard';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Admissions() {
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', ward: '', bed_number: '', admission_date: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/admissions').then(setAdmissions).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    if (user.role !== 'doctor') api.get('/patients').then(setPatients).catch(() => {});
  }, [user.role]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admissions', form);
      setForm({ patient_id: '', ward: '', bed_number: '', admission_date: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function discharge(id) {
    setError('');
    try {
      await api.patch(`/admissions/${id}/discharge`, {});
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Admissions & Beds">
      {error && <div className="alert error">{error}</div>}
      {user.role !== 'doctor' && (
        <div className="card">
          <div className="section-title">
            <h3>Admit Patient</h3>
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ Admit Patient'}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="field"><label>Patient</label>
                <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}
                </select></div>
              <div className="form-row">
                <div className="field"><label>Ward</label>
                  <input required value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></div>
                <div className="field"><label>Bed Number</label>
                  <input required value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} /></div>
                <div className="field"><label>Admission Date</label>
                  <input type="datetime-local" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} /></div>
              </div>
              <button className="btn" type="submit">Admit</button>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-title"><h3>Current & Past Admissions</h3></div>
        {admissions.length === 0 ? (
          <div className="empty-state">No admissions recorded yet.</div>
        ) : (
          <table>
            <thead><tr><th>Patient</th><th>Ward</th><th>Bed</th><th>Admitted</th><th>Discharged</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {admissions.map((a) => (
                <tr key={a.admission_id}>
                  <td>{a.patient_name}</td><td>{a.ward}</td><td>{a.bed_number}</td>
                  <td>{a.admission_date}</td><td>{a.discharge_date || '—'}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {a.status === 'admitted' && (
                      <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => discharge(a.admission_id)}>Discharge</button>
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
