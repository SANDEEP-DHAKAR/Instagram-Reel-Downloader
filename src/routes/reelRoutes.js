const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reelController');
const { validateInstagramUrl } = require('../middlewares/validator');

// POST /api/reels/download - Validate URL and fetch downloadable reel info
router.post('/download', validateInstagramUrl, reelController.downloadReel);

// GET /api/reels/info - Get basic info / shortcode from query url
router.get('/info', reelController.getReelInfo);

// GET /api/reels/stream - Stream media directly for forced file download
router.get('/stream', reelController.streamFile);

module.exports = router;

