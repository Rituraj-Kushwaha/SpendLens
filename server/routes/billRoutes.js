const express = require('express');
const router = express.Router();
const {
    createBill, getBills, getBillById, updateBill, deleteBill,
    markPaid, getDashboardSchedules, getCategories, createCategory
} = require('../controllers/billController');
const { verifyAccessToken } = require('../middleware/authMiddleware');

router.use(verifyAccessToken);

router.get('/dashboard', getDashboardSchedules);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.post('/pay', markPaid);          // POST /api/bills/pay  { scheduleId, ... }

router.route('/')
    .get(getBills)
    .post(createBill);

router.route('/:id')
    .get(getBillById)
    .put(updateBill)
    .delete(deleteBill);

module.exports = router;
