const express = require('express');
const router = express.Router();
const { getAllDoctors, createDoctor, updateDoctor } = require('../controllers/doctorController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllDoctors);
router.post('/', restrictTo('admin', 'clinic'), createDoctor);
router.put('/:id', restrictTo('admin', 'clinic'), updateDoctor);

module.exports = router;
