const { sendError } = require('../utils/response');

/**
 * Middleware to validate Instagram URL
 */
const validateInstagramUrl = (req, res, next) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return sendError(res, 'Instagram Reel URL is required', 400);
  }

  // Matches instagram.com/reel/<id>, instagram.com/p/<id>, or instagram.com/reels/<id>
  const instagramRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i;

  if (!instagramRegex.test(url.trim())) {
    return sendError(res, 'Invalid Instagram URL. Please provide a valid Instagram Reel or Post link.', 400);
  }

  req.cleanInstagramUrl = url.trim();
  next();
};

module.exports = {
  validateInstagramUrl
};

