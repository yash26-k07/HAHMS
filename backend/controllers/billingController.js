const pool = require('../config/db');

async function listInvoices(req, res) {
  const { patient_id, status } = req.query;
  try {
    let sql = `SELECT i.*, p.name AS patient_name,
               COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id), 0) AS amount_paid
               FROM invoices i JOIN patients p ON i.patient_id = p.patient_id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (req.user.role === 'patient') {
      const { rows: p } = await pool.query('SELECT patient_id FROM patients WHERE user_id = $1', [req.user.user_id]);
      sql += ` AND i.patient_id = $${paramIndex++}`; params.push(p[0]?.patient_id || 0);
    } else if (patient_id) {
      sql += ` AND i.patient_id = $${paramIndex++}`; params.push(patient_id);
    }
    if (status) { sql += ` AND i.status = $${paramIndex++}`; params.push(status); }
    sql += ' ORDER BY i.issued_date DESC';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch invoices' });
  }
}

async function getInvoice(req, res) {
  try {
    const { rows: inv } = await pool.query(
      `SELECT i.*, p.name AS patient_name FROM invoices i
       JOIN patients p ON i.patient_id = p.patient_id WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });

    const { rows: items } = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    const { rows: payments } = await pool.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date', [req.params.id]);
    res.json({ ...inv[0], items, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch invoice' });
  }
}

// POST /api/invoices — total_amount is ALWAYS computed server-side from line items,
// never trusted from the client, per the project's data-consistency requirement
async function createInvoice(req, res) {
  const { patient_id, appointment_id, items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'At least one invoice line item is required' });
  }
  const client = await pool.connect();
  try {
    const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unit_price), 0);

    await client.query('BEGIN');
    const { rows: invRows } = await client.query(
      `INSERT INTO invoices (patient_id, appointment_id, total_amount, status) VALUES ($1, $2, $3, 'pending') RETURNING invoice_id`,
      [patient_id, appointment_id || null, total]
    );
    const invoice_id = invRows[0].invoice_id;

    for (const it of items) {
      await client.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [invoice_id, it.description, it.quantity, it.unit_price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ invoice_id, total_amount: total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create invoice' });
  } finally {
    client.release();
  }
}

// POST /api/invoices/:id/payments — records a payment and recalculates invoice status
async function recordPayment(req, res) {
  const { amount, payment_method } = req.body;
  const invoice_id = req.params.id;
  const client = await pool.connect();
  try {
    const { rows: inv } = await client.query('SELECT total_amount FROM invoices WHERE invoice_id = $1', [invoice_id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });

    await client.query('BEGIN');
    await client.query(
      'INSERT INTO payments (invoice_id, amount, payment_method) VALUES ($1, $2, $3)',
      [invoice_id, amount, payment_method || 'cash']
    );

    const { rows: paidRows } = await client.query(
      'SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id = $1', [invoice_id]
    );
    const paid = Number(paidRows[0].paid);
    const total = Number(inv[0].total_amount);
    const status = paid >= total ? 'paid' : paid > 0 ? 'partially_paid' : 'pending';
    await client.query('UPDATE invoices SET status = $1 WHERE invoice_id = $2', [status, invoice_id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment recorded', status, amount_paid: paid });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not record payment' });
  } finally {
    client.release();
  }
}

module.exports = { listInvoices, getInvoice, createInvoice, recordPayment };
