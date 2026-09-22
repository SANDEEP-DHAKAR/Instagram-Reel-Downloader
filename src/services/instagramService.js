const axios = require('axios');
const config = require('../config');

class InstagramService {
  /**
   * Extract Reel/Post shortcode ID from Instagram URL
   * @param {string} url 
   * @returns {string|null}
   */
  extractShortcode(url) {
    const match = url.match(/\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[2] : null;
  }

  /**
   * Main method to fetch Reel data
   * Prioritizes configured providers (EasyDown, RapidAPI) with automatic fallback
   * @param {string} reelUrl 
   */
  async getReelData(reelUrl) {
    const shortcode = this.extractShortcode(reelUrl);
    let lastError = null;

    // 1. Try EasyDown API if configured
    if (config.easyDownKey) {
      try {
        const result = await this.fetchFromEasyDown(reelUrl);
        if (result && (result.videoUrl || result.thumbnail)) {
          return result;
        }
      } catch (err) {
        console.warn('EasyDown API attempt failed:', err.message);
        lastError = err;
      }
    }

    // 2. Try RapidAPI if configured
    if (config.rapidApi.key && config.rapidApi.host) {
      try {
        const result = await this.fetchFromRapidApi(reelUrl);
        if (result && (result.videoUrl || result.thumbnail)) {
          return result;
        }
      } catch (err) {
        console.warn('RapidAPI attempt failed:', err.message);
        lastError = err;
      }
    }

    // If an error occurred during provider calls, throw the error
    if (lastError) {
      throw new Error(`Failed to fetch reel: ${lastError.message}`);
    }

    // Default response when no API provider credentials are set
    return {
      id: shortcode,
      originalUrl: reelUrl,
      message: 'Service is ready. Configure EASYDOWN_API_KEY or RAPIDAPI_KEY in .env to fetch live reel streams.',
      videoUrl: null,
      thumbnail: null,
      caption: null
    };
  }

  /**
   * Fetch Reel using EasyDown Social Media Video Downloader API
   * @param {string} reelUrl 
   */
  async fetchFromEasyDown(reelUrl) {
    try {
      const response = await axios.post(
        'https://api.easydown.org/api/v1/parse',
        { url: reelUrl },
        {
          headers: {
            'Authorization': `Bearer ${config.easyDownKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const resData = response.data;
      const mediaData = resData?.data;

      const videoUrl = mediaData?.videos?.[0]?.url || null;
      const audioUrl = mediaData?.audios?.[0]?.url || null;
      const rawImage = mediaData?.images?.[0];
      const imageFromList = typeof rawImage === 'string' ? rawImage : rawImage?.url;

      const thumbnail = 
        mediaData?.thumbnail ||
        mediaData?.cover ||
        mediaData?.poster ||
        imageFromList ||
        mediaData?.image ||
        mediaData?.thumbnail_url ||
        resData?.thumbnail ||
        resData?.cover ||
        null;
      const caption = mediaData?.title || '';

      return {
        id: this.extractShortcode(reelUrl),
        originalUrl: reelUrl,
        videoUrl,
        audioUrl,
        thumbnail,
        caption,
        platform: mediaData?.platform || 'instagram',
        allVideos: mediaData?.videos || [],
        allImages: mediaData?.images || [],
        allAudios: mediaData?.audios || [],
        provider: 'EasyDown'
      };
    } catch (error) {
      const errMsg = error.response?.data?.msg || error.response?.data?.message || error.message;
      throw new Error(`EasyDown Error: ${errMsg}`);
    }
  }

  /**
   * Fetch Reel using RapidAPI Instagram Downloader
   * @param {string} reelUrl 
   */
  async fetchFromRapidApi(reelUrl) {
    const endpoint = `https://${config.rapidApi.host}/download`;

    try {
      const response = await axios.get(endpoint, {
        params: { url: reelUrl },
        headers: {
          'x-rapidapi-key': config.rapidApi.key,
          'x-rapidapi-host': config.rapidApi.host
        },
        timeout: 15000
      });

      const data = response.data;

      const videoUrl = 
        data?.medias?.[0]?.url ||
        data?.video_url ||
        data?.download_url ||
        data?.data?.video ||
        data?.result?.[0]?.url ||
        (typeof data?.url === 'string' && data.url.includes('.mp4') ? data.url : null) ||
        null;

      const thumbnail =
        data?.thumbnail ||
        data?.cover ||
        data?.medias?.[0]?.thumbnail ||
        data?.data?.thumbnail ||
        null;

      const caption = data?.title || data?.caption || data?.author || '';
      const audioUrl = data?.audio_url || data?.music_url || data?.medias?.find(m => m.type === 'audio')?.url || null;

      const allVideos = data?.medias?.filter(m => m.type === 'video' || (m.extension && m.extension.includes('mp4'))) || (videoUrl ? [{ url: videoUrl, quality: '1080p' }] : []);
      const allAudios = data?.medias?.filter(m => m.type === 'audio' || (m.extension && m.extension.includes('mp3'))) || (audioUrl ? [{ url: audioUrl, quality: 'MP3 Audio' }] : []);

      return {
        id: this.extractShortcode(reelUrl),
        originalUrl: reelUrl,
        videoUrl,
        audioUrl,
        thumbnail,
        caption,
        allVideos,
        allAudios,
        provider: 'RapidAPI',
        raw: data
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'RapidAPI request failed';
      throw new Error(`RapidAPI Error: ${errMsg}`);
    }
  }
}

module.exports = new InstagramService();
