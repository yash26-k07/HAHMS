import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { StatusBadge } from '../components/StatCard';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyItem = { description: '', quantity: 1, unit_price: '' };

export default function Billing() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '' });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManage = ['admin', 'receptionist'].includes(user.role);

  function load() {
    api.get('/invoices').then(setInvoices).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    if (canManage) api.get('/patients').then(setPatients).catch(() => {});
  }, []);

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api.post('/invoices', { patient_id: form.patient_id, items: items.filter((i) => i.description.trim()) });
      setNotice('Invoice created.');
      setForm({ patient_id: '' });
      setItems([{ ...emptyItem }]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function recordPayment(invoiceId) {
    setError(''); setNotice('');
    const draft = paymentDrafts[invoiceId];
    if (!draft?.amount) return;
    try {
      await api.post(`/invoices/${invoiceId}/payments`, { amount: draft.amount, payment_method: draft.method || 'cash' });
      setNotice('Payment recorded.');
      setPaymentDrafts({ ...paymentDrafts, [invoiceId]: { amount: '', method: 'cash' } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title={user.role === 'patient' ? 'My Bills' : 'Billing'}>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {canManage && (
        <div className="card">
          <div className="section-title">
            <h3>Create Invoice</h3>
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ New Invoice'}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="field"><label>Patient</label>
                <select required value={form.patient_id} onChange={(e) => setForm({ patient_id: e.target.value })}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}
                </select></div>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Line Items</label>
              {items.map((it, idx) => (
                <div className="form-row" key={idx} style={{ marginTop: 8 }}>
                  <input placeholder="Description (e.g. Consultation)" value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)} style={{ flex: 2 }} />
                  <input type="number" min="1" placeholder="Qty" value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  <input type="number" min="0" step="0.01" placeholder="Unit Price" value={it.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                </div>
              ))}
              <button type="button" className="btn secondary" style={{ marginTop: 10 }}
                onClick={() => setItems([...items, { ...emptyItem }])}>+ Add line item</button>

              <p style={{ marginTop: 16, fontWeight: 600 }}>Total: ₹{total.toLocaleString()}</p>
              <button className="btn" type="submit">Create Invoice</button>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-title"><h3>Invoices</h3></div>
        {invoices.length === 0 ? (
          <div className="empty-state">No invoices yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Patient</th><th>Total</th><th>Paid</th><th>Status</th>{canManage && <th>Record Payment</th>}</tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoice_id}>
                  <td>{inv.issued_date}</td>
                  <td>{inv.patient_name}</td>
                  <td>₹{Number(inv.total_amount).toLocaleString()}</td>
                  <td>₹{Number(inv.amount_paid).toLocaleString()}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  {canManage && (
                    <td>
                      {inv.status !== 'paid' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="number" min="0" step="0.01" placeholder="Amount" style={{ width: 90, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                            value={paymentDrafts[inv.invoice_id]?.amount || ''}
                            onChange={(e) => setPaymentDrafts({ ...paymentDrafts, [inv.invoice_id]: { ...paymentDrafts[inv.invoice_id], amount: e.target.value } })} />
                          <select style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                            value={paymentDrafts[inv.invoice_id]?.method || 'cash'}
                            onChange={(e) => setPaymentDrafts({ ...paymentDrafts, [inv.invoice_id]: { ...paymentDrafts[inv.invoice_id], method: e.target.value } })}>
                            <option value="cash">Cash</option><option value="card">Card</option>
                            <option value="upi">UPI</option><option value="insurance">Insurance</option>
                          </select>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => recordPayment(inv.invoice_id)}>Pay</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
