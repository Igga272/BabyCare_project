const express = require('express');
const router = express.Router();
const { getAllBabies, getBabyById, createBaby, updateBaby, deleteBaby } = require('../controllers/babyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllBabies);
router.get('/:id', getBabyById);
router.post('/', createBaby);
router.put('/:id', updateBaby);
router.delete('/:id', deleteBaby);

module.exports = router;
