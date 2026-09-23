const express = require('express');
const router = express.Router();
const { getMapsKey } = require('../controllers/configController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/maps-key', getMapsKey);

module.exports = router;
