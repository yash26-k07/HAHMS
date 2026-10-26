const pool = require('../config/db');

async function list(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, COUNT(doc.doctor_id)::int AS doctor_count
       FROM departments d LEFT JOIN doctors doc ON d.department_id = doc.department_id
       GROUP BY d.department_id ORDER BY d.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch departments' });
  }
}

async function create(req, res) {
  const { name, description } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING department_id',
      [name, description || null]
    );
    res.status(201).json({ department_id: rows[0].department_id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department already exists' });
    console.error(err);
    res.status(500).json({ error: 'Could not create department' });
  }
}

async function update(req, res) {
  const { name, description } = req.body;
  try {
    await pool.query('UPDATE departments SET name=$1, description=$2 WHERE department_id=$3', [
      name, description, req.params.id,
    ]);
    res.json({ message: 'Department updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update department' });
  }
}

async function remove(req, res) {
  try {
    await pool.query('DELETE FROM departments WHERE department_id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete department (doctors may reference it)' });
  }
}

module.exports = { list, create, update, remove };
