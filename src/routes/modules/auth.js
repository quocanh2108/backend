const express = require('express');
const { register, login, logout, forgotPassword, resetPassword, refresh, updateProfile, changePassword, getProfile } = require('../../controllers/authController');
const { authenticate } = require('../../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);

router.use(authenticate);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
