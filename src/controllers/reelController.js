const axios = require('axios');
const instagramService = require('../services/instagramService');
const { sendSuccess } = require('../utils/response');

/**
 * Controller to handle Reel download requests
 */
const downloadReel = async (req, res, next) => {
  try {
    const url = req.cleanInstagramUrl;
    const reelData = await instagramService.getReelData(url);

    return sendSuccess(res, reelData, 'Reel data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to extract reel info / shortcode
 */
const getReelInfo = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Query parameter "url" is required' });
    }

    const shortcode = instagramService.extractShortcode(url);
    return sendSuccess(res, { shortcode, originalUrl: url }, 'Reel info parsed');
  } catch (error) {
    next(error);
  }
};

/**
 * Proxy stream endpoint to force file download in browser with attachment header
 */
const streamFile = async (req, res, next) => {
  const { url, filename, type } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Query param "url" is required' });
  }

  const isInline = req.query.inline === 'true';
  const defaultExt = type === 'audio' ? 'instagram-audio.mp3' : (type === 'image' ? 'cover.jpg' : 'instagram-reel.mp4');
  const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_') : defaultExt;

  let contentType = 'video/mp4';
  if (type === 'image') contentType = 'image/jpeg';
  else if (type === 'audio') contentType = 'audio/mpeg';

  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/'
      },
      timeout: 25000,
      maxRedirects: 5
    });

    if (isInline) {
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    }
    res.setHeader('Content-Type', contentType);

    response.data.pipe(res);
  } catch (error) {
    console.error('Stream proxy error:', error.message);
    // Seamless fallback: If stream proxy encounters an issue, redirect browser to direct media URL
    if (!res.headersSent && (url.startsWith('http://') || url.startsWith('https://'))) {
      return res.redirect(302, url);
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to download stream file' });
    }
  }
};

module.exports = {
  downloadReel,
  getReelInfo,
  streamFile
};
