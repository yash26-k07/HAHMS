const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/billingController');

const router = express.Router();
router.use(authenticate);

router.get('/invoices', ctrl.listInvoices); // scoped internally by role
router.get('/invoices/:id', ctrl.getInvoice);
router.post('/invoices', authorize('admin', 'receptionist'), ctrl.createInvoice);
router.post('/invoices/:id/payments', authorize('admin', 'receptionist'), ctrl.recordPayment);

module.exports = router;
