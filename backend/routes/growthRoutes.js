const express = require('express');
const router = express.Router();
const { getGrowthRecords, createGrowthRecord } = require('../controllers/growthController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:babyId', getGrowthRecords);
router.post('/', restrictTo('clinic', 'admin'), createGrowthRecord);

module.exports = router;
