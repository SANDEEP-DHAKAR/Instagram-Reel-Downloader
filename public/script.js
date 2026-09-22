// ==========================================================
// InstaReels Downloader - Created by Sandeep
// Feature-Rich Interactive Script with Multi-Quality Selector
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('downloadForm');
  const urlInput = document.getElementById('urlInput');
  const clearBtn = document.getElementById('clearBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  const statusMessage = document.getElementById('statusMessage');
  const resultCard = document.getElementById('resultCard');

  // Media Showcase & Mode Switcher Elements
  const mediaModeToggle = document.getElementById('mediaModeToggle');
  const btnModeThumb = document.getElementById('btnModeThumb');
  const btnModeVideo = document.getElementById('btnModeVideo');
  const thumbFrame = document.getElementById('thumbFrame');
  const videoFrame = document.getElementById('videoFrame');
  const reelCoverImg = document.getElementById('reelCoverImg');
  const reelVideoPlayer = document.getElementById('reelVideoPlayer');

  const reelTitle = document.getElementById('reelTitle');
  const reelCaption = document.getElementById('reelCaption');
  const toggleCaptionBtn = document.getElementById('toggleCaptionBtn');
  const shortcodeBadge = document.getElementById('shortcodeBadge');
  const qualityBadge = document.getElementById('qualityBadge');

  // Format & Quality Selector Elements
  const chipVideo = document.getElementById('chipVideo');
  const chipAudio = document.getElementById('chipAudio');
  const chipCover = document.getElementById('chipCover');
  const videoQualityGroup = document.getElementById('videoQualityGroup');
  const audioQualityGroup = document.getElementById('audioQualityGroup');
  const videoQualityCards = document.querySelectorAll('#videoQualityGroup .quality-card');
  const audioQualityCards = document.querySelectorAll('#audioQualityGroup .quality-card');

  const mainDownloadBtn = document.getElementById('mainDownloadBtn');
  const mainDownloadText = document.getElementById('mainDownloadText');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const copyCaptionBtn = document.getElementById('copyCaptionBtn');
  const resetBtn = document.getElementById('resetBtn');

  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');

  const historySection = document.getElementById('historySection');
  const historyGrid = document.getElementById('historyGrid');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const toastContainer = document.getElementById('toastContainer');

  let currentReelData = null;
  let selectedFormat = 'video'; // 'video' | 'audio' | 'image'
  let selectedVideoQuality = '1080p';
  let selectedAudioQuality = '320';

  // --------------------------------------------------------
  // 1. Toast Notification Utility
  // --------------------------------------------------------
  function showToast(message, type = 'info', duration = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --------------------------------------------------------
  // 2. Dark / Light Theme Engine
  // --------------------------------------------------------
  const savedTheme = localStorage.getItem('instareels_theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('instareels_theme', newTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // --------------------------------------------------------
  // 3. Input Controls (Clear & One-Click Paste)
  // --------------------------------------------------------
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
    urlInput.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) {
        showToast('Clipboard is empty', 'info');
        return;
      }
      urlInput.value = clipText.trim();
      clearBtn.classList.remove('hidden');
      showToast('Link pasted from clipboard!', 'success');
      urlInput.focus();
    } catch (err) {
      showToast('Please grant clipboard access to paste', 'error');
    }
  });

  // --------------------------------------------------------
  // 4. Loading & Status Helpers
  // --------------------------------------------------------
  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Fetching Reel...';
      spinner.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Fetch Reel';
      spinner.classList.add('hidden');
    }
  }

  function showStatus(text, type = 'error') {
    statusMessage.textContent = text;
    statusMessage.className = `status-box ${type}`;
    statusMessage.classList.remove('hidden');
  }

  function hideStatus() {
    statusMessage.classList.add('hidden');
  }

  // --------------------------------------------------------
  // 5. Form Submission & Download Flow
  // --------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) return;

    hideStatus();
    resultCard.classList.add('hidden');
    setLoading(true);

    try {
      const response = await fetch('/api/instagram/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to retrieve reel. Make sure the link is public.');
      }

      currentReelData = result.data;
      renderResult(currentReelData);
      saveToHistory(currentReelData);
      showToast('Reel fetched successfully by Sandeep!', 'success');

    } catch (err) {
      showStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // --------------------------------------------------------
  // 6. Media Switcher Logic (Thumbnail vs Live Video)
  // --------------------------------------------------------
  function switchMediaMode(mode) {
    if (mode === 'video' && currentReelData?.videoUrl) {
      btnModeVideo.classList.add('active');
      btnModeThumb.classList.remove('active');
      videoFrame.classList.remove('hidden');
      thumbFrame.classList.add('hidden');
    } else {
      btnModeThumb.classList.add('active');
      btnModeVideo.classList.remove('active');
      thumbFrame.classList.remove('hidden');
      videoFrame.classList.add('hidden');
      if (reelVideoPlayer) {
        reelVideoPlayer.pause();
      }
    }
  }

  if (btnModeThumb && btnModeVideo) {
    btnModeThumb.addEventListener('click', () => switchMediaMode('thumb'));
    btnModeVideo.addEventListener('click', () => switchMediaMode('video'));
  }

  // --------------------------------------------------------
  // 7. Interactive Format & Quality Selector Logic
  // --------------------------------------------------------
  chipVideo.addEventListener('click', () => {
    setActiveFormat('video');
  });

  chipAudio.addEventListener('click', () => {
    setActiveFormat('audio');
  });

  chipCover.addEventListener('click', () => {
    setActiveFormat('image');
  });

  function setActiveFormat(format) {
    selectedFormat = format;
    [chipVideo, chipAudio, chipCover].forEach(c => c.classList.remove('active'));

    if (format === 'video') {
      chipVideo.classList.add('active');
      videoQualityGroup.classList.remove('hidden');
      audioQualityGroup.classList.add('hidden');
      switchMediaMode('video');
    } else if (format === 'audio') {
      chipAudio.classList.add('active');
      videoQualityGroup.classList.add('hidden');
      audioQualityGroup.classList.remove('hidden');
      switchMediaMode('thumb');
    } else if (format === 'image') {
      chipCover.classList.add('active');
      videoQualityGroup.classList.add('hidden');
      audioQualityGroup.classList.add('hidden');
      switchMediaMode('thumb');
    }

    updateDownloadButton();
  }

  videoQualityCards.forEach(card => {
    card.addEventListener('click', () => {
      videoQualityCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedVideoQuality = card.dataset.quality || '1080p';
      updateDownloadButton();
    });
  });

  audioQualityCards.forEach(card => {
    card.addEventListener('click', () => {
      audioQualityCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedAudioQuality = card.dataset.audioQuality || '320';
      updateDownloadButton();
    });
  });

  function updateDownloadButton() {
    if (!currentReelData) return;
    const shortcode = currentReelData.id || 'reel';

    if (selectedFormat === 'video') {
      const vidUrl = currentReelData.videoUrl;
      if (!vidUrl) {
        mainDownloadText.textContent = '❌ Video Stream Not Available';
        mainDownloadBtn.removeAttribute('href');
        mainDownloadBtn.removeAttribute('download');
        return;
      }
      const filename = `instagram_reel_${shortcode}_${selectedVideoQuality}.mp4`;
      mainDownloadText.textContent = `⬇️ Download ${selectedVideoQuality.toUpperCase()} Video`;
      mainDownloadBtn.href = `/api/reels/stream?url=${encodeURIComponent(vidUrl)}&filename=${filename}`;
      mainDownloadBtn.setAttribute('download', filename);
      qualityBadge.textContent = selectedVideoQuality.toUpperCase();
    } else if (selectedFormat === 'audio') {
      const audUrl = currentReelData.audioUrl || currentReelData.videoUrl;
      if (!audUrl) {
        mainDownloadText.textContent = '❌ Audio Track Not Available';
        mainDownloadBtn.removeAttribute('href');
        mainDownloadBtn.removeAttribute('download');
        return;
      }
      const filename = `instagram_audio_${shortcode}_${selectedAudioQuality}kbps.mp3`;
      mainDownloadText.textContent = `🎵 Download ${selectedAudioQuality} kbps Audio (MP3)`;
      mainDownloadBtn.href = `/api/reels/stream?url=${encodeURIComponent(audUrl)}&filename=${filename}&type=audio`;
      mainDownloadBtn.setAttribute('download', filename);
      qualityBadge.textContent = `MP3 ${selectedAudioQuality}k`;
    } else if (selectedFormat === 'image') {
      const thumbUrl = currentReelData.thumbnail;
      if (!thumbUrl) {
        mainDownloadText.textContent = '❌ Cover Image Not Available';
        mainDownloadBtn.removeAttribute('href');
        mainDownloadBtn.removeAttribute('download');
        return;
      }
      const filename = `cover_${shortcode}.jpg`;
      mainDownloadText.textContent = `🖼️ Download HD Cover Image (JPG)`;
      mainDownloadBtn.href = `/api/reels/stream?url=${encodeURIComponent(thumbUrl)}&filename=${filename}&type=image`;
      mainDownloadBtn.setAttribute('download', filename);
      qualityBadge.textContent = 'HD Cover';
    }
  }

  // --------------------------------------------------------
  // 8. Render Result Card (Guaranteed Thumbnail & Video)
  // --------------------------------------------------------
  function renderResult(data) {
    const shortcode = data.id || 'Reel';
    shortcodeBadge.textContent = `ID: #${shortcode}`;
    reelTitle.textContent = data.caption ? truncateString(data.caption, 55) : `Instagram Reel #${shortcode}`;

    // Caption handling
    if (data.caption && data.caption.trim().length > 0) {
      reelCaption.textContent = data.caption;
      reelCaption.classList.remove('expanded');
      toggleCaptionBtn.classList.remove('hidden');
      toggleCaptionBtn.textContent = 'Show more';
    } else {
      reelCaption.textContent = data.message || 'No caption provided.';
      toggleCaptionBtn.classList.add('hidden');
    }

    // 1. Guaranteed Thumbnail Display
    const thumbUrl = data.thumbnail;
    if (thumbUrl) {
      const fallbackProxy = `/api/reels/stream?url=${encodeURIComponent(thumbUrl)}&type=image&inline=true`;
      reelCoverImg.src = thumbUrl;
      reelCoverImg.dataset.tried = '';
      reelCoverImg.onerror = function() {
        if (!this.dataset.tried) {
          this.dataset.tried = '1';
          this.src = fallbackProxy;
        }
      };
    }

    // 2. Video Player Display
    if (data.videoUrl) {
      reelVideoPlayer.src = data.videoUrl;
      if (thumbUrl) {
        reelVideoPlayer.poster = thumbUrl;
      }
      btnModeVideo.style.display = 'flex';
    } else {
      btnModeVideo.style.display = 'none';
    }

    // Show mode switcher only if video exists
    if (data.videoUrl && thumbUrl) {
      mediaModeToggle.classList.remove('hidden');
    } else {
      mediaModeToggle.classList.add('hidden');
    }

    // Default format to video if available, else image
    if (data.videoUrl) {
      setActiveFormat('video');
    } else if (thumbUrl) {
      setActiveFormat('image');
    }

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --------------------------------------------------------
  // 8. Interactive Action Buttons
  // --------------------------------------------------------
  toggleCaptionBtn.addEventListener('click', () => {
    const isExpanded = reelCaption.classList.toggle('expanded');
    toggleCaptionBtn.textContent = isExpanded ? 'Show less' : 'Show more';
  });

  copyLinkBtn.addEventListener('click', async () => {
    const link = currentReelData?.videoUrl || currentReelData?.originalUrl;
    if (link) {
      await navigator.clipboard.writeText(link);
      showToast('Link copied to clipboard!', 'success');
    } else {
      showToast('No link available to copy', 'error');
    }
  });

  copyCaptionBtn.addEventListener('click', async () => {
    const caption = currentReelData?.caption;
    if (caption) {
      await navigator.clipboard.writeText(caption);
      showToast('Caption copied to clipboard!', 'success');
    } else {
      showToast('No caption available', 'info');
    }
  });

  resetBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
    resultCard.classList.add('hidden');
    reelVideoPlayer.pause();
    reelVideoPlayer.src = '';
    reelCoverImg.src = '';
    hideStatus();
    urlInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --------------------------------------------------------
  // 9. Download History Engine (LocalStorage)
  // --------------------------------------------------------
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('instareels_history')) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(item) {
    if (!item || !item.originalUrl) return;

    let history = getHistory();
    history = history.filter(h => h.originalUrl !== item.originalUrl);

    history.unshift({
      id: item.id,
      originalUrl: item.originalUrl,
      videoUrl: item.videoUrl,
      thumbnail: item.thumbnail,
      caption: item.caption,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    if (history.length > 8) history.pop();

    localStorage.setItem('instareels_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
      historySection.classList.add('hidden');
      return;
    }

    historyGrid.innerHTML = '';
    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      
      const thumbUrl = item.thumbnail;
      const fallbackProxy = thumbUrl ? `/api/reels/stream?url=${encodeURIComponent(thumbUrl)}&type=image&inline=true` : '';

      const thumbHtml = thumbUrl
        ? `<div class="history-thumb">
             <img 
               src="${thumbUrl}" 
               referrerpolicy="no-referrer"
               alt="Thumbnail" 
               loading="lazy" 
               onerror="if(!this.dataset.tried) { this.dataset.tried=1; this.src='${fallbackProxy}'; }" 
             />
           </div>`
        : `<div class="history-thumb"><div class="history-thumb-placeholder">🎬</div></div>`;

      card.innerHTML = `
        ${thumbHtml}
        <div class="history-info">
          <div class="history-title" title="${item.caption || item.id}">
            ${item.caption ? truncateString(item.caption, 28) : `#${item.id}`}
          </div>
          <div class="history-date">${item.timestamp}</div>
          <button class="history-btn" data-url="${item.originalUrl}">Download</button>
        </div>
      `;

      card.querySelector('.history-btn').addEventListener('click', () => {
        urlInput.value = item.originalUrl;
        clearBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        submitBtn.click();
      });

      historyGrid.appendChild(card);
    });

    historySection.classList.remove('hidden');
  }

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('instareels_history');
    renderHistory();
    showToast('Download history cleared', 'info');
  });

  function truncateString(str, num) {
    if (!str) return '';
    return str.length > num ? str.slice(0, num) + '...' : str;
  }

  // Initial history load
  renderHistory();
});
