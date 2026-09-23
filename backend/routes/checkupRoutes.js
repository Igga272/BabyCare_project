const express = require('express');
const router = express.Router();
const { getCheckupsByBaby } = require('../controllers/checkupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:babyId', getCheckupsByBaby);

module.exports = router;
