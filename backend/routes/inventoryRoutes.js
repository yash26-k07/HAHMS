const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/inventoryController');

const router = express.Router();
router.use(authenticate, authorize('admin', 'receptionist'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/adjust', ctrl.adjustStock);
router.delete('/:id', ctrl.remove);

module.exports = router;
