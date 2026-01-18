# YT Clipper - Deployment Guide

## 🚀 Deploy to Render.com (Free Tier)

### Prerequisites
1. GitHub account with your code pushed
2. Render account (free at [render.com](https://render.com))
3. MongoDB Atlas database (free at [mongodb.com/atlas](https://mongodb.com/atlas))

---

## Step 1: Prepare MongoDB Atlas

1. Go to [MongoDB Atlas](https://mongodb.com/atlas) and create a free account
2. Create a new cluster (M0 Free Tier)
3. Click **Database Access** → Add a database user (remember username/password)
4. Click **Network Access** → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
5. Click **Connect** → **Connect your application** → Copy the connection string
6. Your URI will look like: `mongodb+srv://username:password@cluster.mongodb.net/ytclipper`

---

## Step 2: Build the Frontend

Run this command in the project root to build and prepare for deployment:

```bash
# Navigate to client folder
cd client

# Install dependencies and build
npm install
npm run build

# Copy build to server
# Windows (PowerShell):
Copy-Item -Recurse -Force .\dist\* ..\server\public\

# macOS/Linux:
# cp -r dist/* ../server/public/
```

---

## Step 3: Deploy to Render

1. Go to [render.com](https://render.com) → **Dashboard** → **New** → **Web Service**

2. Connect your GitHub repository

3. Configure the service:
   | Setting | Value |
   |---------|-------|
   | **Name** | `yt-clipper` (or any name) |
   | **Region** | Closest to you |
   | **Branch** | `main` |
   | **Root Directory** | `server` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |

4. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | A random secure string (e.g., `mySecretKey123!@#`) |
   | `GEMINI_API_KEY` | Your Google AI Gemini API key |
   | `YOUTUBE_API_KEY` | Your YouTube Data API key |
   | `PORT` | `10000` (Render's default) |

5. Click **Create Web Service**

---

## Step 4: Access Your App

After deployment completes (3-5 minutes), your app will be live at:
```
https://your-app-name.onrender.com
```

---

## ⚠️ Important Notes

### Cold Starts
- Free tier services **sleep after 15 minutes** of inactivity
- First request after sleep takes **30-50 seconds** to wake up
- Subsequent requests are fast

### Updating Your App
1. Push changes to GitHub
2. Render automatically redeploys

### Updating Frontend
Whenever you change frontend code:
```bash
cd client
npm run build
Copy-Item -Recurse -Force .\dist\* ..\server\public\
git add .
git commit -m "Update frontend build"
git push
```

---

## 🔧 Local Development

For local development, the app automatically uses `localhost:5000` for API calls.

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000
