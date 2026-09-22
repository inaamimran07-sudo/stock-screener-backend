# ⚡ Quick Start - 15 Minutes to Deploy

## Step 1: Generate New API Keys (5 min)

Open in separate tabs:
1. https://console.groq.com → Create API key → Copy
2. https://finnhub.io/dashboard → Create API key → Copy  
3. https://twelvedata.com/user/account → Create API key → Copy
4. https://newsapi.org/account → Create API key → Copy

**REVOKE THESE COMPROMISED KEYS:**
- Groq: `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`
- Finnhub: `d9rnmahr01qoo7o54fp0d9rnmahr01qoo7o54fpg`
- Twelve Data: `a63e2a46b0274f91a96f4ce3d9107988`
- NewsAPI: `97e01abaa614480c817bfe18b39de94d`

## Step 2: Deploy Backend to Render (5 min)

1. Go to https://render.com (sign up if needed)
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Name: `stock-screener-backend`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add Environment Variables:
   ```
   PORT=8000
   CLIENT_URL=https://YOUR-VERCEL-URL-HERE
   ADMIN_EMAIL=your-email@example.com
   FINNHUB_API_KEY=paste_new_key
   TWELVE_DATA_KEY=paste_new_key
   NEWS_API_KEY=paste_new_key
   GROQ_API_KEY=paste_new_key
   ```
8. Deploy and **copy the URL** (e.g., `https://stock-screener-backend-xxxxx.onrender.com`)

## Step 3: Deploy Frontend to Vercel (5 min)

1. Go to https://vercel.com (sign up if needed)
2. Click "Add New..." → "Project"
3. Select GitHub repo
4. Select folder: `./frontend`
5. Framework: Create React App
6. Add Environment Variables (Settings → Environment Variables):
   ```
   REACT_APP_API_URL=https://stock-screener-backend-XXXXX.onrender.com/api
   REACT_APP_SOCKET_URL=https://stock-screener-backend-XXXXX.onrender.com
   ```
   (Replace XXXXX with your Render URL)
7. Deploy

## Step 4: Verify Deployment

1. Visit your Vercel URL
2. Sign up with admin email: `your-email@example.com`
3. You should auto-approve (it's admin)
4. Login
5. Go to Dashboard → should see 5 sample stocks
6. Go to Screener → filter stocks
7. Go to AI Assistant → ask "What's my portfolio value?"

## 🎯 You're Done!

Your production app is now live:
- **Frontend:** https://your-vercel-url.vercel.app
- **Backend:** https://stock-screener-backend-xxxxx.onrender.com

## ⚠️ Common Issues

**Issue: Login fails with "Unexpected token '<'"**
- Solution: Verify `REACT_APP_API_URL` is set correctly in Vercel

**Issue: Render app goes to sleep after 15 min inactivity**
- Solution: Upgrade to paid Render plan, or hit backend every 14 min

**Issue: AI Assistant returns error**
- Solution: Verify GROQ_API_KEY is correct and not the old compromised one

**Issue: Stocks not loading**
- Solution: Verify FINNHUB_API_KEY is correct

## 📱 Next Steps

- Add real stock data (currently showing 5 sample stocks)
- Implement portfolio saving
- Add watchlist functionality
- Enable live chat between users
- Create mobile app

## 🔗 Links

- GitHub: https://github.com/inaamimran07-sudo/stock-screener-backend
- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
