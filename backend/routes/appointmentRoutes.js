const express = require('express');
const router = express.Router();
const { getMyAppointments, createAppointment, cancelAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMyAppointments);
router.post('/', createAppointment);
router.put('/:id/cancel', cancelAppointment);

module.exports = router;
