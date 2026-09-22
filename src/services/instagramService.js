const axios = require('axios');
const config = require('../config');
const ytdlpManager = require('../utils/ytdlpManager');

class InstagramService {
  /**
   * Extract Reel/Post shortcode ID from Instagram URL
   * @param {string} url 
   * @returns {string|null}
   */
  extractShortcode(url) {
    const match = url.match(/\/(reel|reels|p|tv|share)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[2] : null;
  }

  /**
   * Main method to fetch Reel data
   * Prioritizes yt-dlp engine with automatic fallback to EasyDown & RapidAPI
   * @param {string} reelUrl 
   */
  async getReelData(reelUrl) {
    const shortcode = this.extractShortcode(reelUrl);
    let lastError = null;

    // 1. Try yt-dlp first (Local & Serverless standalone binary extractor)
    try {
      const ytResult = await ytdlpManager.extractMediaInfo(reelUrl);
      if (ytResult && (ytResult.videoUrl || ytResult.thumbnail)) {
        return ytResult;
      }
    } catch (err) {
      console.warn('yt-dlp attempt failed:', err.message);
      lastError = err;
    }

    // 2. Try EasyDown API if configured
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

    // 3. Try RapidAPI if configured
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

    // If an error occurred across all providers, format a clear, user-friendly error
    if (lastError) {
      const msg = lastError.message || '';
      if (msg.includes('Insufficient credits')) {
        throw new Error('EasyDown API credits are exhausted. Please add credits or update RapidAPI credentials.');
      }
      if (msg.includes('undergoing an upgrade')) {
        throw new Error('RapidAPI provider is temporarily undergoing maintenance. Please try again later.');
      }
      if (msg.includes('empty media response') || msg.includes('not granting access') || msg.includes('login')) {
        throw new Error('Instagram requires authentication. Add a cookies.txt file to root or configure an active RapidAPI key in .env.');
      }
      throw new Error(`Failed to fetch reel: ${msg}`);
    }

    // Default response when no API provider credentials are set
    return {
      id: shortcode,
      originalUrl: reelUrl,
      message: 'Service is ready. Configure EASYDOWN_API_KEY, RAPIDAPI_KEY, or cookies.txt to fetch live reel streams.',
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
    const endpointsToTry = [
      `https://${config.rapidApi.host}/download`,
      `https://${config.rapidApi.host}/`
    ];

    let response = null;
    let lastErr = null;

    for (const ep of endpointsToTry) {
      try {
        response = await axios.get(ep, {
          params: { url: reelUrl },
          headers: {
            'x-rapidapi-key': config.rapidApi.key,
            'x-rapidapi-host': config.rapidApi.host
          },
          timeout: 15000
        });
        if (response && response.data) break;
      } catch (err) {
        lastErr = err;
        if (err.response?.status !== 404) {
          break;
        }
      }
    }

    if (!response || !response.data) {
      const errMsg = lastErr?.response?.data?.message || lastErr?.message || 'RapidAPI request failed';
      throw new Error(`RapidAPI Error: ${errMsg}`);
    }

    const data = response.data;

    const videoUrl = 
      data?.medias?.[0]?.url ||
      data?.video_url ||
      data?.download_url ||
      data?.data?.video ||
      data?.data?.[0]?.url ||
      data?.data?.url ||
      data?.result?.[0]?.url ||
      data?.result?.video ||
      data?.video ||
      (typeof data?.url === 'string' && (data.url.includes('.mp4') || data.url.includes('cdn')) ? data.url : null) ||
      (Array.isArray(data) && data[0]?.url ? data[0].url : null) ||
      null;

    const thumbnail =
      data?.thumbnail ||
      data?.cover ||
      data?.medias?.[0]?.thumbnail ||
      data?.data?.thumbnail ||
      data?.data?.[0]?.thumbnail ||
      data?.result?.[0]?.thumbnail ||
      data?.image ||
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
  }
}

module.exports = new InstagramService();
