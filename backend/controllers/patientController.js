const pool = require('../config/db');

// GET /api/patients?search=  (admin/receptionist/doctor see all; patients see only themselves via /me)
async function list(req, res) {
  const { search } = req.query;
  try {
    let sql = 'SELECT * FROM patients';
    const params = [];
    if (search) {
      sql += ' WHERE name ILIKE $1 OR contact ILIKE $2 OR email ILIKE $3';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch patients' });
  }
}

async function getById(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM patients WHERE patient_id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });

    // Patients may only view their own record
    if (req.user.role === 'patient' && rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to view this record' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch patient' });
  }
}

// POST /api/patients  — staff registering a walk-in patient (no login account)
async function create(req, res) {
  const { name, age, gender, contact, email, address, blood_group } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO patients (name, age, gender, contact, email, address, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING patient_id`,
      [name, age || null, gender, contact, email || null, address || null, blood_group || null]
    );
    res.status(201).json({ patient_id: rows[0].patient_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create patient' });
  }
}

async function update(req, res) {
  const { name, age, gender, contact, email, address, blood_group } = req.body;
  try {
    const { rows: existing } = await pool.query('SELECT * FROM patients WHERE patient_id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'patient' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to update this record' });
    }

    await pool.query(
      `UPDATE patients SET name=$1, age=$2, gender=$3, contact=$4, email=$5, address=$6, blood_group=$7
       WHERE patient_id=$8`,
      [name, age, gender, contact, email, address, blood_group, req.params.id]
    );
    res.json({ message: 'Patient updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update patient' });
  }
}

async function remove(req, res) {
  try {
    await pool.query('DELETE FROM patients WHERE patient_id = $1', [req.params.id]);
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete patient (may have linked records)' });
  }
}

// GET /api/patients/:id/history — visits, records, invoices in one call
async function history(req, res) {
  try {
    const patientId = req.params.id;
    const { rows: appointments } = await pool.query(
      `SELECT a.*, d.name AS doctor_name FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.patient_id = $1 ORDER BY a.appointment_date DESC`,
      [patientId]
    );
    const { rows: records } = await pool.query(
      'SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY visit_date DESC',
      [patientId]
    );
    const { rows: invoices } = await pool.query(
      'SELECT * FROM invoices WHERE patient_id = $1 ORDER BY issued_date DESC',
      [patientId]
    );
    res.json({ appointments, records, invoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch patient history' });
  }
}

module.exports = { list, getById, create, update, remove, history };
