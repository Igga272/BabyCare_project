const express = require('express');
const router = express.Router();
const { getDashboardStats, getAllUsers, createClinicStaff } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.post('/clinic-staff', createClinicStaff);

module.exports = router;
