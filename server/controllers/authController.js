const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/generateTokens');
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

const setRefreshCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

// POST /api/auth/register
const register = catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    const existing = await userService.findByEmail(email);
    if (existing) return next(new AppError('Email already registered', 400));

    const user = await userService.createUser({ name, email, password });

    const accessToken = createAccessToken(user.user_id);
    const refreshToken = createRefreshToken(user.user_id);

    await userService.storeRefreshToken(
        user.user_id, hashToken(refreshToken),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { accessToken, user }, error: null });
});

// POST /api/auth/login
const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await userService.findByEmail(email);
    if (!user || !(await userService.verifyPassword(password, user.password_hash))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    delete user.password_hash;

    const accessToken = createAccessToken(user.user_id);
    const refreshToken = createRefreshToken(user.user_id);

    await userService.storeRefreshToken(
        user.user_id, hashToken(refreshToken),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: { accessToken, user }, error: null });
});

// POST /api/auth/refresh
const refreshTokenHandler = catchAsync(async (req, res, next) => {
    const token = req.cookies.refreshToken;
    if (!token) return next(new AppError('No refresh token provided', 401));

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
    catch (err) { return next(new AppError('Invalid refresh token', 401)); }

    const stored = await userService.findRefreshToken(hashToken(token));
    if (!stored) return next(new AppError('Invalid refresh token', 401));

    await userService.deleteRefreshToken(hashToken(token));

    const newAccessToken = createAccessToken(decoded.userId);
    const newRefreshToken = createRefreshToken(decoded.userId);

    await userService.storeRefreshToken(
        decoded.userId, hashToken(newRefreshToken),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    setRefreshCookie(res, newRefreshToken);
    res.status(200).json({ success: true, data: { accessToken: newAccessToken }, error: null });
});

// POST /api/auth/logout
const logout = catchAsync(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) await userService.deleteRefreshToken(hashToken(token));
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, data: null, error: null });
});

// GET /api/auth/me
const getMe = catchAsync(async (req, res, next) => {
    const user = await userService.findById(req.user.userId);
    if (!user) return next(new AppError('User not found', 404));
    res.status(200).json({ success: true, data: { user }, error: null });
});

// PATCH /api/auth/me
const updateMe = catchAsync(async (req, res) => {
    const allowed = ['name', 'currency', 'theme', 'date_format', 'monthly_budget', 'notification_prefs'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await userService.updateUser(req.user.userId, updates);
    res.status(200).json({ success: true, data: { user }, error: null });
});

// PATCH /api/auth/password
const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return next(new AppError('Both passwords required', 400));
    if (newPassword.length < 6) return next(new AppError('New password must be at least 6 characters', 400));

    const userWithHash = await userService.findByEmail(
        (await userService.findById(req.user.userId)).email
    );
    const ok = await userService.verifyPassword(currentPassword, userWithHash.password_hash);
    if (!ok) return next(new AppError('Current password is incorrect', 401));

    await userService.updatePassword(req.user.userId, newPassword);
    res.status(200).json({ success: true, data: null, error: null });
});

// DELETE /api/auth/me
const deleteAccount = catchAsync(async (req, res) => {
    await userService.deleteAccount(req.user.userId);
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, data: null, error: null });
});

module.exports = { register, login, refreshToken: refreshTokenHandler, logout, getMe, updateMe, changePassword, deleteAccount };
