const express = require('express');
const router = express.Router();
const { getClinicAppointments, updateAppointmentStatus, deleteAppointment, addCheckupForBaby } = require('../controllers/clinicAppointmentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);
router.use(restrictTo('clinic', 'admin'));

router.get('/appointments', getClinicAppointments);
router.put('/appointments/:id/status', updateAppointmentStatus);
router.delete('/appointments/:id', deleteAppointment);
router.post('/checkups', addCheckupForBaby);

module.exports = router;
