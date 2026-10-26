const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function list(req, res) {
  const { department_id, search } = req.query;
  try {
    let sql = `SELECT doc.*, dep.name AS department_name FROM doctors doc
                JOIN departments dep ON doc.department_id = dep.department_id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    if (department_id) { sql += ` AND doc.department_id = $${paramIndex++}`; params.push(department_id); }
    if (search) { sql += ` AND doc.name ILIKE $${paramIndex++}`; params.push(`%${search}%`); }
    sql += ' ORDER BY doc.name';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch doctors' });
  }
}

async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT doc.*, dep.name AS department_name FROM doctors doc
       JOIN departments dep ON doc.department_id = dep.department_id WHERE doc.doctor_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch doctor' });
  }
}

// Admin creates a doctor: makes a linked user account (role=doctor) + doctor profile
async function create(req, res) {
  const { name, email, password, department_id, specialization, availability, consultation_fee, phone } = req.body;
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.length) return res.status(409).json({ error: 'A user with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING user_id',
      [name, email, password_hash, 'doctor', phone || null]
    );

    const { rows: docRows } = await client.query(
      `INSERT INTO doctors (user_id, name, department_id, specialization, availability, consultation_fee)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING doctor_id`,
      [userRows[0].user_id, name, department_id, specialization || null, availability || null, consultation_fee || 0]
    );

    await client.query('COMMIT');
    res.status(201).json({ doctor_id: docRows[0].doctor_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create doctor' });
  } finally {
    client.release();
  }
}

async function update(req, res) {
  const { name, department_id, specialization, availability, consultation_fee } = req.body;
  try {
    await pool.query(
      `UPDATE doctors SET name=$1, department_id=$2, specialization=$3, availability=$4, consultation_fee=$5
       WHERE doctor_id=$6`,
      [name, department_id, specialization, availability, consultation_fee, req.params.id]
    );
    res.json({ message: 'Doctor updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update doctor' });
  }
}

async function remove(req, res) {
  try {
    const { rows: doc } = await pool.query('SELECT user_id FROM doctors WHERE doctor_id = $1', [req.params.id]);
    if (!doc.length) return res.status(404).json({ error: 'Doctor not found' });
    await pool.query('DELETE FROM users WHERE user_id = $1', [doc[0].user_id]); // cascades to doctors row
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove doctor' });
  }
}

module.exports = { list, getById, create, update, remove };
