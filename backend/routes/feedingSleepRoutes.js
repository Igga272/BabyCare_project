const express = require('express');
const router = express.Router();
const { getFeedingLogs, createFeedingLog, getSleepLogs, createSleepLog } = require('../controllers/feedingSleepController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/feeding/:babyId', getFeedingLogs);
router.post('/feeding', createFeedingLog);
router.get('/sleep/:babyId', getSleepLogs);
router.post('/sleep', createSleepLog);

module.exports = router;
