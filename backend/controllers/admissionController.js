const pool = require('../config/db');

async function list(req, res) {
  const { status } = req.query;
  try {
    let sql = `SELECT ad.*, p.name AS patient_name FROM admissions ad
               JOIN patients p ON ad.patient_id = p.patient_id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    if (status) { sql += ` AND ad.status = $${paramIndex++}`; params.push(status); }
    sql += ' ORDER BY ad.admission_date DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch admissions' });
  }
}

async function create(req, res) {
  const { patient_id, ward, bed_number, admission_date } = req.body;
  try {
    const { rows: clash } = await pool.query(
      `SELECT admission_id FROM admissions WHERE ward=$1 AND bed_number=$2 AND status='admitted'`,
      [ward, bed_number]
    );
    if (clash.length) return res.status(409).json({ error: 'That bed is currently occupied' });

    const { rows } = await pool.query(
      'INSERT INTO admissions (patient_id, ward, bed_number, admission_date) VALUES ($1, $2, $3, $4) RETURNING admission_id',
      [patient_id, ward, bed_number, admission_date || new Date()]
    );
    res.status(201).json({ admission_id: rows[0].admission_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not admit patient' });
  }
}

async function discharge(req, res) {
  try {
    await pool.query(
      `UPDATE admissions SET status='discharged', discharge_date=NOW() WHERE admission_id=$1`,
      [req.params.id]
    );
    res.json({ message: 'Patient discharged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not discharge patient' });
  }
}

module.exports = { list, create, discharge };
