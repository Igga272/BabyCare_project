const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, resendVerificationCode, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;