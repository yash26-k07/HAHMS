import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/departments').then(setDepartments).catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/departments', form);
      setForm({ name: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Departments">
      {error && <div className="alert error">{error}</div>}
      <div className="card">
        <div className="section-title">
          <h3>All Departments</h3>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Department'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
            <div className="form-row">
              <div className="field"><label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <button className="btn" type="submit">Save Department</button>
          </form>
        )}

        {departments.length === 0 ? (
          <div className="empty-state">No departments yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Doctors</th></tr></thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.department_id}>
                  <td>{d.name}</td><td>{d.description || '—'}</td><td>{d.doctor_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
