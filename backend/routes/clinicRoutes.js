const express = require('express');
const router = express.Router();
const { getAllClinics, getHospitalInfo } = require('../controllers/clinicController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/hospital-info', getHospitalInfo);
router.get('/', getAllClinics);

module.exports = router;