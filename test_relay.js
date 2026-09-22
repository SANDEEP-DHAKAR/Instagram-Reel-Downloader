const axios = require('axios');

async function testRelayScraper() {
  const shortcode = 'C8q_Xq0I7m4';
  const url = `https://www.instagram.com/reel/${shortcode}/`;

  console.log('Fetching', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    console.log('HTML Status:', res.status, 'Length:', res.data.length);
    const html = res.data;

    // Search for video URLs
    const patterns = [
      /"video_versions":\[\{[^}]*?"url":"(https:\/\/[^"]+)"/,
      /"video_url":"(https:\/\/[^"]+)"/,
      /property="og:video" content="(https:\/\/[^"]+)"/,
      /"playable_url":"(https:\/\/[^"]+)"/,
      /"browser_native_hd_url":"(https:\/\/[^"]+)"/,
      /"browser_native_sd_url":"(https:\/\/[^"]+)"/,
      /https?:\\\/\\\/[^"'\s]+cdninstagram[^"'\s]*?\.mp4[^"'\s]*/
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = html.match(patterns[i]);
      if (match) {
        let clean = match[1] || match[0];
        clean = clean.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
        console.log(`Pattern ${i} matched:`, clean.substring(0, 100));
      }
    }

    // Search for thumbnail
    const thumbPatterns = [
      /property="og:image" content="(https:\/\/[^"]+)"/,
      /"display_url":"(https:\/\/[^"]+)"/,
      /"image_versions2":\{"candidates":\[\{"url":"(https:\/\/[^"]+)"/
    ];
    for (let i = 0; i < thumbPatterns.length; i++) {
      const match = html.match(thumbPatterns[i]);
      if (match) {
        let clean = match[1] || match[0];
        clean = clean.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
        console.log(`Thumb Pattern ${i} matched:`, clean.substring(0, 100));
      }
    }

    // Search for xdt_api__v1__media__shortcode__web_info
    const xdtIdx = html.indexOf('xdt_api__v1__media__shortcode__web_info');
    console.log('xdt_api index:', xdtIdx);

  } catch (err) {
    console.log('Error:', err.message);
  }
}

testRelayScraper();

