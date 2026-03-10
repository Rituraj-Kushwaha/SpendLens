const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, getMe, updateMe, changePassword, deleteAccount } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const { runValidation } = require('../middleware/validateMiddleware');
const { verifyAccessToken } = require('../middleware/authMiddleware');

router.post('/register', registerValidator, runValidation, register);
router.post('/login', loginValidator, runValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', verifyAccessToken, getMe);
router.patch('/me', verifyAccessToken, updateMe);
router.patch('/password', verifyAccessToken, changePassword);
router.delete('/me', verifyAccessToken, deleteAccount);

module.exports = router;
