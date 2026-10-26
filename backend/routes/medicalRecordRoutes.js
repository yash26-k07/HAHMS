const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/medicalRecordController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.list); // scoped internally by role
router.get('/:id', ctrl.getById);
router.post('/', authorize('doctor'), ctrl.create);

module.exports = router;
