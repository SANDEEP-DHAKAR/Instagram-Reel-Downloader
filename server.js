const app = require('./src/app');
const config = require('./src/config');

const PORT = config.port;

// Start HTTP server only if not running inside serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Server running in ${config.env} mode`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);

    // Initialize yt-dlp binary in background
    const ytdlpManager = require('./src/utils/ytdlpManager');
    ytdlpManager.setupYtDlp().catch(err => {
      console.warn('Initial yt-dlp setup notice:', err.message);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection Error:', err);
    server.close(() => process.exit(1));
  });
}

module.exports = app;

