const pool = require('../config/db');

// GET /api/reports/summary — top-level dashboard numbers for admins
async function summary(req, res) {
  try {
    const { rows: [{ total_patients }] } = await pool.query('SELECT COUNT(*)::int AS total_patients FROM patients');
    const { rows: [{ total_doctors }] } = await pool.query('SELECT COUNT(*)::int AS total_doctors FROM doctors');
    const { rows: [{ appointments_today }] } = await pool.query(
      'SELECT COUNT(*)::int AS appointments_today FROM appointments WHERE appointment_date = CURRENT_DATE'
    );
    const { rows: [{ admitted_now }] } = await pool.query(
      `SELECT COUNT(*)::int AS admitted_now FROM admissions WHERE status = 'admitted'`
    );
    const { rows: [{ revenue_this_month }] } = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS revenue_this_month FROM payments
       WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );
    const { rows: [{ pending_amount }] } = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0)::numeric AS pending_amount FROM invoices WHERE status != 'paid'`
    );
    const { rows: lowStock } = await pool.query('SELECT * FROM inventory WHERE quantity <= reorder_level');

    const { rows: byDepartment } = await pool.query(
      `SELECT dep.name AS department, COUNT(a.appointment_id)::int AS appointment_count
       FROM appointments a
       JOIN doctors doc ON a.doctor_id = doc.doctor_id
       JOIN departments dep ON doc.department_id = dep.department_id
       WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY dep.name ORDER BY appointment_count DESC`
    );

    res.json({
      total_patients, total_doctors, appointments_today, admitted_now,
      revenue_this_month, pending_amount, low_stock_items: lowStock, appointments_by_department: byDepartment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not build report summary' });
  }
}

module.exports = { summary };
