const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/summary', ctrl.summary);

module.exports = router;
