const pool = require('../config/db');

async function list(req, res) {
  const { low_stock } = req.query;
  try {
    let sql = 'SELECT * FROM inventory';
    if (low_stock === 'true') sql += ' WHERE quantity <= reorder_level';
    sql += ' ORDER BY name';
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch inventory' });
  }
}

async function create(req, res) {
  const { name, category, quantity, unit, reorder_level, expiry_date } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO inventory (name, category, quantity, unit, reorder_level, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING item_id`,
      [name, category || null, quantity || 0, unit || 'units', reorder_level || 10, expiry_date || null]
    );
    res.status(201).json({ item_id: rows[0].item_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create inventory item' });
  }
}

async function update(req, res) {
  const { name, category, quantity, unit, reorder_level, expiry_date } = req.body;
  try {
    await pool.query(
      `UPDATE inventory SET name=$1, category=$2, quantity=$3, unit=$4, reorder_level=$5, expiry_date=$6
       WHERE item_id=$7`,
      [name, category, quantity, unit, reorder_level, expiry_date, req.params.id]
    );
    res.json({ message: 'Inventory item updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update inventory item' });
  }
}

async function adjustStock(req, res) {
  const { delta } = req.body; // positive to restock, negative to consume
  try {
    const numDelta = Number(delta);
    if (!Number.isFinite(numDelta)) return res.status(400).json({ error: 'Invalid delta value' });

    const { rows } = await pool.query(
      'UPDATE inventory SET quantity = quantity + $1 WHERE item_id = $2 AND quantity + $1 >= 0 RETURNING quantity',
      [numDelta, req.params.id]
    );
    if (!rows.length) {
      // Either item doesn't exist or stock would go negative
      const { rows: exists } = await pool.query('SELECT item_id FROM inventory WHERE item_id = $1', [req.params.id]);
      if (!exists.length) return res.status(404).json({ error: 'Item not found' });
      return res.status(400).json({ error: 'Stock cannot go negative' });
    }
    res.json({ message: 'Stock adjusted', quantity: rows[0].quantity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not adjust stock' });
  }
}

async function remove(req, res) {
  try {
    await pool.query('DELETE FROM inventory WHERE item_id = $1', [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete item' });
  }
}

module.exports = { list, create, update, adjustStock, remove };
