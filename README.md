# 📸 Instagram Reel Downloader

A lightweight, modular Node.js & Express application to download Instagram Reels and Posts via Public APIs.

---

## 📁 Project Structure

```
instagram-reel-downloader/
├── src/
│   ├── config/
│   │   └── index.js              # Centralized configuration & environment loader
│   ├── controllers/
│   │   └── reelController.js     # Request & response handler for reels
│   ├── middlewares/
│   │   ├── errorHandler.js       # Centralized 404 & 500 error handler
│   │   └── validator.js          # URL regex validation for Instagram reels/posts
│   ├── routes/
│   │   └── reelRoutes.js         # API routes (/api/reels)
│   ├── services/
│   │   └── instagramService.js   # Public API integration (RapidAPI, custom endpoints)
│   ├── utils/
│   │   └── response.js           # Standard API response formatters
│   └── app.js                   # Express application setup
├── public/                      # Frontend UI (HTML, CSS, Vanilla JS)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.example                 # Environment variables template
├── .env                         # Local environment variables
├── .gitignore                   # Git ignore file
├── package.json                 # Project dependencies & scripts
└── server.js                    # Application entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Open `.env` and add your settings:
```env
PORT=5000
NODE_ENV=development

# Optional: Add RapidAPI or your Public API credentials
RAPIDAPI_KEY=your_key_here
RAPIDAPI_HOST=your_host_here
```

### 3. Run Development Server
```bash
npm run dev
```
Or for production:
```bash
npm start
```

Open your browser at `http://localhost:5000` to access the interactive web interface!

---

## 📡 API Endpoints

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Response**:
```json
{
  "status": "online",
  "timestamp": "2026-09-22T06:58:00.000Z",
  "service": "Instagram Reel Downloader API"
}
```

### 2. Fetch / Download Reel
- **Endpoint**: `POST /api/instagram/download` (or `POST /api/reels/download`)
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "url": "https://www.instagram.com/reel/C8XYZ123abc/"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Reel data retrieved successfully",
  "data": {
    "id": "C8XYZ123abc",
    "originalUrl": "https://www.instagram.com/reel/C8XYZ123abc/",
    "videoUrl": "https://...",
    "thumbnail": "https://...",
    "caption": "Reel caption here"
  }
}
```

### 3. Parse Reel Info
- **Endpoint**: `GET /api/reels/info?url=https://www.instagram.com/reel/C8XYZ123abc/`

