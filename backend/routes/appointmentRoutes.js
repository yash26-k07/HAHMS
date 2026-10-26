const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/appointmentController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.list); // scoped internally by role
router.post('/', authorize('admin', 'receptionist', 'patient'), ctrl.create);
router.put('/:id', authorize('admin', 'receptionist'), ctrl.update);
router.patch('/:id/status', authorize('admin', 'receptionist', 'doctor'), ctrl.updateStatus);
router.delete('/:id', authorize('admin', 'receptionist', 'patient'), ctrl.remove);

module.exports = router;
