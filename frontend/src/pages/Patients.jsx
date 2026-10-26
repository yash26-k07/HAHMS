import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', age: '', gender: 'other', contact: '', email: '', address: '', blood_group: '' };

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(setPatients).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/patients', form);
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Patients">
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="section-title">
          <input
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 10, width: 320 }}
          />
          {user.role !== 'doctor' && (
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ Register Patient'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="form-row">
              <div className="field"><label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Age</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
              <div className="field"><label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Contact</label>
                <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="field"><label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Blood Group</label>
                <input value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} /></div>
            </div>
            <div className="field"><label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <button className="btn" type="submit">Save Patient</button>
          </form>
        )}

        {patients.length === 0 ? (
          <div className="empty-state">No patients found.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Contact</th><th>Blood Group</th></tr></thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.patient_id}>
                  <td>{p.name}</td><td>{p.age ?? '—'}</td><td>{p.gender}</td>
                  <td>{p.contact}</td><td>{p.blood_group || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
