const pool = require('../config/db');

async function list(req, res) {
  const { patient_id } = req.query;
  try {
    let sql = `SELECT mr.*, p.name AS patient_name, doc.name AS doctor_name
               FROM medical_records mr
               JOIN patients p ON mr.patient_id = p.patient_id
               JOIN doctors doc ON mr.doctor_id = doc.doctor_id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (req.user.role === 'patient') {
      const { rows: p } = await pool.query('SELECT patient_id FROM patients WHERE user_id = $1', [req.user.user_id]);
      sql += ` AND mr.patient_id = $${paramIndex++}`; params.push(p[0]?.patient_id || 0);
    } else if (req.user.role === 'doctor') {
      const { rows: d } = await pool.query('SELECT doctor_id FROM doctors WHERE user_id = $1', [req.user.user_id]);
      sql += ` AND mr.doctor_id = $${paramIndex++}`; params.push(d[0]?.doctor_id || 0);
    } else if (patient_id) {
      sql += ` AND mr.patient_id = $${paramIndex++}`; params.push(patient_id);
    }
    sql += ' ORDER BY mr.visit_date DESC';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch medical records' });
  }
}

async function getById(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM medical_records WHERE record_id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Record not found' });

    if (req.user.role === 'patient') {
      const { rows: p } = await pool.query('SELECT patient_id FROM patients WHERE user_id = $1', [req.user.user_id]);
      if (rows[0].patient_id !== p[0]?.patient_id) return res.status(403).json({ error: 'Not authorized' });
    }

    const { rows: prescriptions } = await pool.query('SELECT * FROM prescriptions WHERE record_id = $1', [req.params.id]);
    res.json({ ...rows[0], prescriptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch record' });
  }
}

// Only doctors create medical records, from a completed/ongoing appointment
async function create(req, res) {
  const { patient_id, appointment_id, visit_date, diagnosis, notes, follow_up_date, prescriptions } = req.body;
  const client = await pool.connect();
  try {
    const { rows: d } = await client.query('SELECT doctor_id FROM doctors WHERE user_id = $1', [req.user.user_id]);
    if (!d.length) return res.status(403).json({ error: 'Only doctors can create medical records' });
    const doctor_id = d[0].doctor_id;

    await client.query('BEGIN');
    const { rows: result } = await client.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, visit_date, diagnosis, notes, follow_up_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING record_id`,
      [patient_id, doctor_id, appointment_id || null, visit_date, diagnosis || null, notes || null, follow_up_date || null]
    );
    const record_id = result[0].record_id;

    if (Array.isArray(prescriptions)) {
      for (const rx of prescriptions) {
        await client.query(
          'INSERT INTO prescriptions (record_id, medicine, dosage, duration, instructions) VALUES ($1, $2, $3, $4, $5)',
          [record_id, rx.medicine, rx.dosage, rx.duration || null, rx.instructions || null]
        );
      }
    }

    if (appointment_id) {
      await client.query(`UPDATE appointments SET status = 'completed' WHERE appointment_id = $1`, [appointment_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ record_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create medical record' });
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create };
