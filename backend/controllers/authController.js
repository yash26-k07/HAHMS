const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function signToken(user) {
  const payload = { user_id: user.user_id, role: user.role, name: user.name };
  if (user.patient_id) payload.patient_id = user.patient_id;
  if (user.doctor_id) payload.doctor_id = user.doctor_id;
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// Public self-registration — always creates a 'patient' role account + patient profile
async function register(req, res) {
  const { name, email, password, age, gender, contact, address, blood_group } = req.body;
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING user_id',
      [name, email, password_hash, 'patient', contact || null]
    );
    const user_id = userRows[0].user_id;

    const { rows: patientRows } = await client.query(
      `INSERT INTO patients (user_id, name, age, gender, contact, email, address, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING patient_id`,
      [user_id, name, age || null, gender || 'other', contact || '', email, address || null, blood_group || null]
    );

    await client.query('COMMIT');

    const user = { user_id, role: 'patient', name, patient_id: patientRows[0].patient_id };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
}

// Login for any role (admin/doctor/receptionist/patient)
async function login(req, res) {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Attach profile ID so downstream controllers don't need extra DB lookups
    if (user.role === 'patient') {
      const { rows: p } = await pool.query('SELECT patient_id FROM patients WHERE user_id = $1', [user.user_id]);
      if (p.length) user.patient_id = p[0].patient_id;
    } else if (user.role === 'doctor') {
      const { rows: d } = await pool.query('SELECT doctor_id FROM doctors WHERE user_id = $1', [user.user_id]);
      if (d.length) user.doctor_id = d[0].doctor_id;
    }

    const token = signToken(user);
    res.json({
      token,
      user: { user_id: user.user_id, name: user.name, role: user.role, email: user.email,
              ...(user.patient_id && { patient_id: user.patient_id }),
              ...(user.doctor_id && { doctor_id: user.doctor_id }) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
}

// Returns the logged-in user's own profile (patient or doctor row, if applicable)
async function me(req, res) {
  try {
    const { user_id, role } = req.user;
    const { rows: userRows } = await pool.query(
      'SELECT user_id, name, email, role, phone FROM users WHERE user_id = $1',
      [user_id]
    );
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });

    let profile = null;
    if (role === 'patient') {
      const { rows: p } = await pool.query('SELECT * FROM patients WHERE user_id = $1', [user_id]);
      profile = p[0] || null;
    } else if (role === 'doctor') {
      const { rows: d } = await pool.query('SELECT * FROM doctors WHERE user_id = $1', [user_id]);
      profile = d[0] || null;
    }
    res.json({ ...userRows[0], profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile' });
  }
}

// Change password for logged-in user
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const { user_id } = req.user;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [user_id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, user_id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

module.exports = { register, login, me, changePassword };
