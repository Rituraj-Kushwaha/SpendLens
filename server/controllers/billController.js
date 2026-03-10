const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const billService = require('../services/billService');
const scheduleService = require('../services/scheduleService');
const transactionService = require('../services/transactionService');

// POST /api/bills
const createBill = catchAsync(async (req, res, next) => {
    const { title, category_id, amount, bill_date, due_date, frequency, interval_days, tenure, notes, skipDuplicateCheck } = req.body;

    if (!title || !amount || !bill_date || !frequency) {
        return next(new AppError('title, amount, bill_date, and frequency are required', 400));
    }

    // Duplicate detection
    if (!skipDuplicateCheck) {
        const dupe = await billService.checkDuplicate(req.user.userId, title, amount, bill_date);
        if (dupe) {
            return res.status(409).json({
                success: false,
                data: { existingBill: dupe },
                error: 'A similar bill already exists. Send skipDuplicateCheck=true to confirm creation.',
            });
        }
    }

    const result = await billService.createBill(req.user.userId, req.body);

    // Fetch first 3 schedules for the response preview
    const schedules = await billService.getBillSchedules(result.bill.bill_id, req.user.userId);

    res.status(201).json({
        success: true,
        data: {
            bill: result.bill,
            schedulesCreated: result.schedulesCreated,
            schedulesPreview: schedules.slice(0, 3),
        },
        error: null,
    });
});

// GET /api/bills
const getBills = catchAsync(async (req, res) => {
    const bills = await billService.getBillsByUser(req.user.userId);
    res.status(200).json({ success: true, data: { bills }, error: null });
});

// GET /api/bills/categories
const getCategories = catchAsync(async (req, res) => {
    const categories = await billService.getCategories(req.user.userId);
    res.status(200).json({ success: true, data: { categories }, error: null });
});

// POST /api/bills/categories
const createCategory = catchAsync(async (req, res, next) => {
    const { category_name } = req.body;
    if (!category_name?.trim()) return next(new AppError('category_name is required', 400));
    const cat = await billService.createCategory(req.user.userId, category_name.trim());
    res.status(201).json({ success: true, data: { category: cat }, error: null });
});

// GET /api/bills/:id
const getBillById = catchAsync(async (req, res, next) => {
    const bill = await billService.getBillById(req.params.id, req.user.userId);
    if (!bill) return next(new AppError('Bill not found', 404));
    const schedules = await billService.getBillSchedules(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { bill, schedules }, error: null });
});

// PUT /api/bills/:id
const updateBill = catchAsync(async (req, res, next) => {
    const bill = await billService.updateBill(req.params.id, req.user.userId, req.body);
    if (!bill) return next(new AppError('Bill not found', 404));
    res.status(200).json({ success: true, data: { bill }, error: null });
});

// DELETE /api/bills/:id
// ?mode=single  → skip just this schedule (provide scheduleId in body)
// ?mode=future  → remove all future pending schedules + soft-delete bill (default)
const deleteBill = catchAsync(async (req, res, next) => {
    const { mode } = req.query;
    if (mode === 'single') {
        const { scheduleId } = req.body;
        if (!scheduleId) return next(new AppError('scheduleId required for single mode', 400));
        const skipped = await scheduleService.skipSchedule(scheduleId, req.user.userId);
        if (!skipped) return next(new AppError('Schedule not found', 404));
        return res.status(200).json({ success: true, data: { skipped }, error: null });
    }
    // Default: delete all future + soft-delete bill
    await billService.deleteBill(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: null, error: null });
});

// POST /api/bills/:id/pay  (or POST /api/schedules/:scheduleId/pay)
const markPaid = catchAsync(async (req, res, next) => {
    const { scheduleId, amount, payment_method, payment_reference } = req.body;
    if (!scheduleId) return next(new AppError('scheduleId is required', 400));
    try {
        const result = await transactionService.confirmPayment(
            scheduleId, req.user.userId,
            { amount: parseFloat(amount), payment_method, payment_reference }
        );
        res.status(200).json({ success: true, data: result, error: null });
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
});

// GET /api/bills/dashboard  — pending + overdue schedules
const getDashboardSchedules = catchAsync(async (req, res) => {
    const [pending, paidThisMonth] = await Promise.all([
        scheduleService.getPendingSchedules(req.user.userId),
        scheduleService.getPaidThisMonth(req.user.userId),
    ]);
    res.status(200).json({ success: true, data: { pending, paidThisMonth }, error: null });
});

module.exports = { createBill, getBills, getBillById, updateBill, deleteBill, markPaid, getDashboardSchedules, getCategories, createCategory };
