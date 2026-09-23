const express = require('express');
const router = express.Router();
const { getTestsByBaby, createTest } = require('../controllers/newbornTestController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:babyId', getTestsByBaby);
router.post('/', restrictTo('clinic', 'admin'), createTest);

module.exports = router;
