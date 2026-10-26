const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/patientController');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('admin', 'receptionist', 'doctor'), ctrl.list);
router.get('/:id', ctrl.getById); // internally checks patient self-access
router.get('/:id/history', ctrl.history);
router.post('/', authorize('admin', 'receptionist'), ctrl.create);
router.put('/:id', ctrl.update); // internally checks patient self-access
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
