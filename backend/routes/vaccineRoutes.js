const express = require('express');
const router = express.Router();
const { getVaccineScheduleByBaby, markVaccineCompleted, updateVaccinationSchedule } = require('../controllers/vaccineController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:babyId', getVaccineScheduleByBaby);
router.put('/:id/complete', restrictTo('clinic', 'admin'), markVaccineCompleted);
router.put('/:id', restrictTo('admin', 'clinic'), updateVaccinationSchedule);

module.exports = router;