const express = require('express');
const router = express.Router();
const { searchBabies, getBabyProfile } = require('../controllers/babyRecordsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);
router.use(restrictTo('admin', 'clinic'));

router.get('/', searchBabies);
router.get('/:babyId', getBabyProfile);

module.exports = router;
