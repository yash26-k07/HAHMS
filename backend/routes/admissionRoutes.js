const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/admissionController');

const router = express.Router();
router.use(authenticate, authorize('admin', 'receptionist', 'doctor'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id/discharge', ctrl.discharge);

module.exports = router;
