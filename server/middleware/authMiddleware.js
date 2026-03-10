const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');

const verifyAccessToken = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next(new AppError('You are not logged in.', 401));

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await userService.findById(decoded.userId);
    if (!user) return next(new AppError('User no longer exists.', 401));

    req.user = { userId: decoded.userId };
    next();
});

module.exports = { verifyAccessToken };
