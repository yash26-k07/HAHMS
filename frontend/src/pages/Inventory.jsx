import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';

const empty = { name: '', category: '', quantity: '', unit: 'units', reorder_level: 10, expiry_date: '' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/inventory').then(setItems).catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/inventory', form);
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function adjust(id, delta) {
    setError('');
    try {
      await api.patch(`/inventory/${id}/adjust`, { delta });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Inventory">
      {error && <div className="alert error">{error}</div>}
      <div className="card">
        <div className="section-title">
          <h3>Medicine & Consumable Stock</h3>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
            <div className="form-row">
              <div className="field"><label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Quantity</label>
                <input type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="field"><label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="field"><label>Reorder Level</label>
                <input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
              <div className="field"><label>Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <button className="btn" type="submit">Save Item</button>
          </form>
        )}

        {items.length === 0 ? (
          <div className="empty-state">No inventory items yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Reorder Level</th><th>Expiry</th><th>Adjust</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id}>
                  <td>{it.name}</td><td>{it.category || '—'}</td>
                  <td style={{ color: it.quantity <= it.reorder_level ? 'var(--danger)' : 'inherit', fontWeight: it.quantity <= it.reorder_level ? 700 : 400 }}>
                    {it.quantity} {it.unit}
                  </td>
                  <td>{it.reorder_level}</td>
                  <td>{it.expiry_date || '—'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => adjust(it.item_id, 10)}>+10</button>
                    <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => adjust(it.item_id, -1)}>-1</button>
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
