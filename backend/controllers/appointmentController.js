const pool = require('../config/db');

const BASE_SELECT = `
  SELECT a.*, p.name AS patient_name, doc.name AS doctor_name, dep.name AS department_name
  FROM appointments a
  JOIN patients p ON a.patient_id = p.patient_id
  JOIN doctors doc ON a.doctor_id = doc.doctor_id
  JOIN departments dep ON doc.department_id = dep.department_id
`;

// GET /api/appointments?patient_id=&doctor_id=&date=&status=
async function list(req, res) {
  const { patient_id, doctor_id, date, status } = req.query;
  try {
    let sql = BASE_SELECT + ' WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Patients can only ever see their own appointments
    if (req.user.role === 'patient') {
      const { rows: p } = await pool.query('SELECT patient_id FROM patients WHERE user_id = $1', [req.user.user_id]);
      sql += ` AND a.patient_id = $${paramIndex++}`;
      params.push(p[0]?.patient_id || 0);
    } else if (patient_id) {
      sql += ` AND a.patient_id = $${paramIndex++}`; params.push(patient_id);
    }

    if (doctor_id) { sql += ` AND a.doctor_id = $${paramIndex++}`; params.push(doctor_id); }
    if (date) { sql += ` AND a.appointment_date = $${paramIndex++}`; params.push(date); }
    if (status) { sql += ` AND a.status = $${paramIndex++}`; params.push(status); }
    sql += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch appointments' });
  }
}

// POST /api/appointments — books a slot; relies on the DB unique constraint as the
// authoritative guard against double-booking, with a friendly pre-check first
async function create(req, res) {
  const { patient_id, doctor_id, appointment_date, appointment_time, reason } = req.body;
  try {
    const { rows: clash } = await pool.query(
      `SELECT appointment_id FROM appointments WHERE doctor_id=$1 AND appointment_date=$2 AND appointment_time=$3 AND status NOT IN ('cancelled')`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (clash.length) {
      return res.status(409).json({ error: 'This doctor already has an appointment at that date and time' });
    }

    const { rows } = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING appointment_id`,
      [patient_id, doctor_id, appointment_date, appointment_time, reason || null]
    );
    res.status(201).json({ appointment_id: rows[0].appointment_id });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'This doctor already has an appointment at that date and time' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not book appointment' });
  }
}

// PATCH /api/appointments/:id/status  { status }
async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status value' });
  try {
    await pool.query('UPDATE appointments SET status = $1 WHERE appointment_id = $2', [status, req.params.id]);
    res.json({ message: 'Appointment status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update appointment' });
  }
}

// PUT /api/appointments/:id — reschedule
async function update(req, res) {
  const { appointment_date, appointment_time, reason } = req.body;
  try {
    const { rows: clash } = await pool.query(
      `SELECT appointment_id FROM appointments a
       WHERE doctor_id = (SELECT doctor_id FROM appointments WHERE appointment_id = $1)
       AND appointment_date=$2 AND appointment_time=$3 AND appointment_id != $4 AND status NOT IN ('cancelled')`,
      [req.params.id, appointment_date, appointment_time, req.params.id]
    );
    if (clash.length) return res.status(409).json({ error: 'Doctor is not available at that new slot' });

    await pool.query(
      'UPDATE appointments SET appointment_date=$1, appointment_time=$2, reason=$3 WHERE appointment_id=$4',
      [appointment_date, appointment_time, reason, req.params.id]
    );
    res.json({ message: 'Appointment rescheduled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reschedule appointment' });
  }
}

async function remove(req, res) {
  try {
    await pool.query(`UPDATE appointments SET status = 'cancelled' WHERE appointment_id = $1`, [req.params.id]);
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel appointment' });
  }
}

module.exports = { list, create, updateStatus, update, remove };
