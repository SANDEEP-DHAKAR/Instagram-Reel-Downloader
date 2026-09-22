const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const axios = require('axios');

const isWin = process.platform === 'win32';
const targetBinary = isWin ? 'yt-dlp.exe' : 'yt-dlp';

// Use /tmp for serverless environments (Vercel/AWS Lambda) or local project bin directory
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const binDir = isServerless ? '/tmp' : path.join(__dirname, '..', '..', 'bin');
const targetPath = path.join(binDir, targetBinary);

const downloadUrl = isWin
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

let isSettingUp = false;
let setupPromise = null;

/**
 * Download and configure yt-dlp binary if not present
 */
async function setupYtDlp() {
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }

  if (isSettingUp && setupPromise) {
    return setupPromise;
  }

  isSettingUp = true;
  setupPromise = (async () => {
    try {
      if (!fs.existsSync(binDir)) {
        try {
          fs.mkdirSync(binDir, { recursive: true });
        } catch (e) {
          console.warn('Notice creating binDir:', e.message);
        }
      }

      console.log(`Checking yt-dlp binary for platform: ${process.platform}...`);
      console.log(`Downloading yt-dlp binary from ${downloadUrl}...`);

      try {
        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 60000,
          maxRedirects: 5
        });

        fs.writeFileSync(targetPath, Buffer.from(response.data));
        console.log(`Successfully downloaded yt-dlp binary to ${targetPath}`);
      } catch (err) {
        console.error('Error downloading yt-dlp binary:', err.message);

        // Fallback for Linux if curl/wget is available
        if (!isWin) {
          try {
            console.log('Trying curl fallback for Linux...');
            execSync(`curl -L -o "${targetPath}" "${downloadUrl}" && chmod +x "${targetPath}"`);
            console.log('Successfully installed yt-dlp via curl fallback!');
          } catch (curlErr) {
            console.error('Curl fallback failed:', curlErr.message);
          }
        }
      }

      // Ensure executable permissions on Linux/macOS
      if (!isWin) {
        if (fs.existsSync(targetPath)) {
          try {
            fs.chmodSync(targetPath, '755');
            console.log(`Successfully granted executable permission to yt-dlp at ${targetPath}`);
          } catch (e) {}
        }

        try {
          const ffmpegPath = require('ffmpeg-static');
          if (ffmpegPath && fs.existsSync(ffmpegPath)) {
            fs.chmodSync(ffmpegPath, '755');
            console.log(`Successfully granted executable permission to ffmpeg binary at ${ffmpegPath}`);
          }
        } catch (e) {
          console.log('ffmpeg-static check notice:', e.message);
        }
      }

      // Self-update check
      if (fs.existsSync(targetPath)) {
        try {
          console.log('Checking for yt-dlp binary self-update...');
          execSync(`"${targetPath}" -U`, { timeout: 15000 });
        } catch (uErr) {
          console.log('yt-dlp self-update notice:', uErr.message);
        }
      }

      return targetPath;
    } finally {
      isSettingUp = false;
    }
  })();

  return setupPromise;
}

/**
 * Find ffmpeg binary if available
 */
function getFfmpegPath() {
  try {
    const ffmpeg = require('ffmpeg-static');
    if (ffmpeg && fs.existsSync(ffmpeg)) {
      return ffmpeg;
    }
  } catch (e) {}
  return null;
}

/**
 * Extract media info using yt-dlp
 * @param {string} url 
 * @returns {Promise<Object>}
 */
async function extractMediaInfo(url) {
  const binary = await setupYtDlp();

  if (!fs.existsSync(binary)) {
    throw new Error('yt-dlp binary is not available');
  }

  // Check for cookies file (root cookies.txt, /tmp/cookies.txt, or .env INSTAGRAM_COOKIE)
  let cookieArg = '';
  const rootCookies = path.join(__dirname, '..', '..', 'cookies.txt');
  const tmpCookies = path.join('/tmp', 'cookies.txt');

  if (fs.existsSync(rootCookies)) {
    cookieArg = `--cookies "${rootCookies}"`;
  } else if (fs.existsSync(tmpCookies)) {
    cookieArg = `--cookies "${tmpCookies}"`;
  } else if (process.env.INSTAGRAM_COOKIE) {
    try {
      const cookieFilePath = isServerless ? '/tmp/ig_cookie.txt' : path.join(binDir, 'ig_cookie.txt');
      fs.writeFileSync(cookieFilePath, process.env.INSTAGRAM_COOKIE, 'utf8');
      cookieArg = `--cookies "${cookieFilePath}"`;
    } catch (e) {}
  }

  const ffmpeg = getFfmpegPath();
  const ffmpegArg = ffmpeg ? `--ffmpeg-location "${ffmpeg}"` : '';

  const command = `"${binary}" --dump-json --no-warnings --no-playlist ${cookieArg} ${ffmpegArg} "${url}"`;

  return new Promise((resolve, reject) => {
    exec(command, { timeout: 25000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const errorMsg = stderr || err.message;
        return reject(new Error(errorMsg));
      }

      try {
        const data = JSON.parse(stdout.trim());
        
        // Find highest quality video and audio URLs
        const videoUrl = data.url || data.formats?.filter(f => f.vcodec !== 'none')?.pop()?.url || null;
        const audioUrl = data.formats?.filter(f => f.acodec !== 'none' && f.vcodec === 'none')?.pop()?.url || null;
        const thumbnail = data.thumbnail || data.thumbnails?.pop()?.url || null;
        const caption = data.title || data.description || '';

        // Formats list for quality selector
        const allVideos = (data.formats || [])
          .filter(f => f.url && f.vcodec !== 'none')
          .map(f => ({
            url: f.url,
            quality: f.format_note || (f.height ? `${f.height}p` : 'HD Video'),
            ext: f.ext || 'mp4'
          }));

        if (allVideos.length === 0 && videoUrl) {
          allVideos.push({ url: videoUrl, quality: '1080p', ext: 'mp4' });
        }

        const allAudios = (data.formats || [])
          .filter(f => f.url && (f.acodec !== 'none' || f.vcodec === 'none'))
          .map(f => ({
            url: f.url,
            quality: f.abr ? `${Math.round(f.abr)} kbps` : 'Audio (MP3/M4A)',
            ext: f.ext || 'mp3'
          }));

        if (allAudios.length === 0 && audioUrl) {
          allAudios.push({ url: audioUrl, quality: 'Audio MP3', ext: 'mp3' });
        }

        resolve({
          id: data.id,
          originalUrl: url,
          title: caption,
          caption,
          videoUrl,
          audioUrl: audioUrl || videoUrl,
          thumbnail,
          allVideos,
          allAudios,
          provider: 'yt-dlp',
          duration: data.duration
        });
      } catch (parseErr) {
        reject(new Error(`Failed to parse yt-dlp output: ${parseErr.message}`));
      }
    });
  });
}

module.exports = {
  setupYtDlp,
  extractMediaInfo,
  targetPath
};

