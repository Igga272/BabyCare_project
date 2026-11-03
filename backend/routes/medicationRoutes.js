const express = require('express');
const router = express.Router();
const { getMedicationsByBaby, createMedication, toggleReminder, deleteMedication } = require('../controllers/medicationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:babyId', getMedicationsByBaby);
router.post('/', restrictTo('clinic', 'admin'), createMedication);
router.put('/:id/reminder', toggleReminder);
router.delete('/:id', deleteMedication);

module.exports = router;