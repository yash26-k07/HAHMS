import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';

const empty = {
  name: '', email: '', password: '', department_id: '', specialization: '',
  availability: '', consultation_fee: '', phone: '',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/doctors').then(setDoctors).catch((e) => setError(e.message));
    api.get('/departments').then(setDepartments).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/doctors', form);
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Doctors">
      {error && <div className="alert error">{error}</div>}
      <div className="card">
        <div className="section-title">
          <h3>All Doctors</h3>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Doctor'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
            <div className="form-row">
              <div className="field"><label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Email (login)</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Temporary Password</label>
                <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Department</label>
                <select required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Select…</option>
                  {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select></div>
              <div className="field"><label>Specialization</label>
                <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
              <div className="field"><label>Consultation Fee</label>
                <input type="number" value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} /></div>
            </div>
            <div className="field"><label>Availability</label>
              <input placeholder="e.g. Mon-Fri 09:00-17:00" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /></div>
            <button className="btn" type="submit">Save Doctor</button>
          </form>
        )}

        {doctors.length === 0 ? (
          <div className="empty-state">No doctors yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Specialization</th><th>Availability</th><th>Fee</th></tr></thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.doctor_id}>
                  <td>{d.name}</td><td>{d.department_name}</td><td>{d.specialization || '—'}</td>
                  <td>{d.availability || '—'}</td><td>₹{d.consultation_fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
