// ==========================================================
// InstaReels Downloader - Feature-Rich Client Script
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
  const mediaContainer = document.getElementById('mediaContainer');
  const mediaTabs = document.getElementById('mediaTabs');
  const tabVideo = document.getElementById('tabVideo');
  const tabThumb = document.getElementById('tabThumb');

  const reelTitle = document.getElementById('reelTitle');
  const reelCaption = document.getElementById('reelCaption');
  const toggleCaptionBtn = document.getElementById('toggleCaptionBtn');
  const shortcodeBadge = document.getElementById('shortcodeBadge');
  const qualityBadge = document.getElementById('qualityBadge');

  const downloadVideoBtn = document.getElementById('downloadVideoBtn');
  const downloadThumbBtn = document.getElementById('downloadThumbBtn');
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
    mediaContainer.innerHTML = '';
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
      showToast('Reel fetched successfully!', 'success');

    } catch (err) {
      showStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // --------------------------------------------------------
  // 6. Media Tabs (Video vs Thumbnail)
  // --------------------------------------------------------
  tabVideo.addEventListener('click', () => {
    showVideoPreview();
  });

  tabThumb.addEventListener('click', () => {
    showThumbPreview();
  });

  function showVideoPreview() {
    tabThumb.classList.remove('active');
    tabVideo.classList.add('active');

    if (currentReelData?.videoUrl) {
      const posterUrl = currentReelData.thumbnail || '';
      mediaContainer.innerHTML = `
        <video controls autoplay muted playsinline poster="${posterUrl}">
          <source src="${currentReelData.videoUrl}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
      `;
    } else {
      showThumbPreview();
    }
  }

  function showThumbPreview() {
    tabVideo.classList.remove('active');
    tabThumb.classList.add('active');

    const thumbUrl = currentReelData?.thumbnail;
    if (thumbUrl) {
      const fallbackProxy = `/api/reels/stream?url=${encodeURIComponent(thumbUrl)}&type=image&inline=true`;
      mediaContainer.innerHTML = `
        <img 
          src="${thumbUrl}" 
          referrerpolicy="no-referrer"
          alt="Instagram Reel Cover" 
          onerror="if(!this.dataset.tried) { this.dataset.tried=1; this.src='${fallbackProxy}'; }"
        />
      `;
    } else {
      mediaContainer.innerHTML = `
        <div class="history-thumb-placeholder">
          <span>🖼️ No Thumbnail</span>
        </div>
      `;
    }
  }

  // --------------------------------------------------------
  // 7. Render Result Card
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

    // Tab visibility
    if (data.videoUrl && data.thumbnail) {
      mediaTabs.classList.remove('hidden');
      tabVideo.classList.remove('hidden');
      tabThumb.classList.remove('hidden');
      showVideoPreview();
    } else if (data.thumbnail) {
      mediaTabs.classList.remove('hidden');
      tabVideo.classList.add('hidden');
      showThumbPreview();
    } else if (data.videoUrl) {
      mediaTabs.classList.add('hidden');
      showVideoPreview();
    } else {
      mediaTabs.classList.add('hidden');
      mediaContainer.innerHTML = `
        <div class="history-thumb-placeholder">
          <span>🎬</span>
        </div>
      `;
    }

    // Action buttons configuration
    if (data.videoUrl) {
      downloadVideoBtn.href = `/api/reels/stream?url=${encodeURIComponent(data.videoUrl)}&filename=instagram_reel_${shortcode}.mp4`;
      downloadVideoBtn.classList.remove('hidden');
      qualityBadge.textContent = 'HD 1080p';
    } else {
      downloadVideoBtn.classList.add('hidden');
      qualityBadge.textContent = data.thumbnail ? 'Cover Only' : 'Verified Link';
    }

    if (data.thumbnail) {
      downloadThumbBtn.href = `/api/reels/stream?url=${encodeURIComponent(data.thumbnail)}&filename=cover_${shortcode}.jpg&type=image`;
      downloadThumbBtn.classList.remove('hidden');
    } else {
      downloadThumbBtn.classList.add('hidden');
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
      showToast('Video link copied to clipboard!', 'success');
    } else {
      showToast('No video link available to copy', 'error');
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
    mediaContainer.innerHTML = '';
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
