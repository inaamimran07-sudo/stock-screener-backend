# Stock Screener Platform 🚀

Professional stock screening platform with real-time data, AI analysis, halal screening, and advanced portfolio management.

## 📋 Features

✅ **User Management** - Registration, approval system, authentication  
✅ **Stock Screener** - Real-time filtering with P/E, ROE, D/E ratios  
✅ **Halal Screening** - Automatic halal compliance checking  
✅ **Portfolio Dashboard** - Holdings tracking, gain/loss analysis  
✅ **Orders System** - Buy/sell execution with history  
✅ **AI Assistant** - Groq-powered analysis of stocks & portfolio  
✅ **Real-Time Updates** - Socket.io integration  
✅ **Admin Panel** - User approval & system management  
✅ **Cyberpunk Design** - Futuristic UI with glassmorphic effects  

## 🏗️ Architecture

```
stock-screener-full/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main React component
    │   ├── App.css            # Styling
    │   └── index.js           # Entry point
    ├── public/
    │   └── index.html
    ├── package.json
    ├── .gitignore
    └── .env (via Vercel)
```

## 🚀 Deployment Guide

### Step 1: Prepare API Keys

**CRITICAL**: You MUST revoke all old API keys and generate new ones:

1. **Groq** (Free, no credit card)
   - Visit: https://console.groq.com
   - Create new API key
   - Revoke old key: `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`

2. **Finnhub** (Quotes, company data)
   - Visit: https://finnhub.io/dashboard
   - Create new API key
   - Revoke old key: `d9rnmahr01qoo7o54fp0d9rnmahr01qoo7o54fpg`

3. **Twelve Data** (Charts, candles)
   - Visit: https://twelvedata.com/user/account
   - Create new API key
   - Revoke old key: `a63e2a46b0274f91a96f4ce3d9107988`

4. **NewsAPI** (Financial news)
   - Visit: https://newsapi.org/account
   - Create new API key
   - Revoke old key: `97e01abaa614480c817bfe18b39de94d`

### Step 2: Deploy Backend (Render)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Stock screener full stack"
   git push origin main
   ```

2. **Create Render Service**
   - Go to https://render.com
   - Click "New +"  → "Web Service"
   - Connect GitHub repo → Select `stock-screener-backend` folder
   - Name: `stock-screener-backend`
   - Environment: Node
   - Build command: `npm install`
   - Start command: `npm start`

3. **Add Environment Variables** (in Render dashboard)
   ```
   PORT=8000
   CLIENT_URL=https://stock-screener-frontend-fawn.vercel.app
   ADMIN_EMAIL=your-email@example.com
   FINNHUB_API_KEY=your_new_key_here
   TWELVE_DATA_KEY=your_new_key_here
   NEWS_API_KEY=your_new_key_here
   GROQ_API_KEY=your_new_key_here
   ```

4. **Deploy** and note the URL (e.g., `https://stock-screener-backend-xxxxx.onrender.com`)

### Step 3: Deploy Frontend (Vercel)

1. **Push to GitHub** (frontend folder)
   - Same repo structure as above

2. **Create Vercel Project**
   - Go to https://vercel.com
   - Click "Add New..." → "Project"
   - Select GitHub repo
   - Select `frontend` folder as root
   - Framework: Create React App

3. **Add Environment Variables** (Vercel dashboard)
   - Go to Settings → Environment Variables
   - Add (visibility: "config", not "secret"):
     ```
     REACT_APP_API_URL=https://stock-screener-backend-xxxxx.onrender.com/api
     REACT_APP_SOCKET_URL=https://stock-screener-backend-xxxxx.onrender.com
     ```
   - Replace `xxxxx` with your actual Render URL

4. **Deploy** and test login

### Step 4: Test Deployment

1. **Frontend**
   - Visit your Vercel URL
   - Try login/register
   - Should reach backend successfully

2. **Backend Health Check**
   ```bash
   curl https://stock-screener-backend-xxxxx.onrender.com/api/stocks/screen
   # Should return: { "ok": true, "stocks": [...] }
   ```

3. **Test Stock Data**
   - Go to Screener page
   - Should show 5 sample stocks with halal indicator

4. **Test AI Chat**
   - Go to AI Assistant page
   - Ask: "What's in my portfolio?"
   - Should get response from Groq

## 📝 Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local:
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
echo "REACT_APP_SOCKET_URL=http://localhost:8000" >> .env.local
npm start
# Opens http://localhost:3000
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/pending-users` - List pending (admin)
- `POST /api/auth/approve-user/:email` - Approve user (admin)

### Stocks
- `GET /api/stocks/quote/:ticker` - Get stock price
- `GET /api/stocks/company/:ticker` - Get company info
- `GET /api/stocks/screen?halal=true&minScore=75` - Screen stocks

### Orders
- `POST /api/orders/create` - Create order
- `GET /api/orders` - List active orders

### AI
- `POST /api/ai/chat` - Send message to Groq

### User
- `GET /api/users/me` - Get current user
- `POST /api/users/set-username` - Set username

## 🎨 Design System

**Colors:**
- Background: `#0a0e27` (deep navy)
- Surface: `#1a1f3a`
- Primary: `#00f0ff` (cyan)
- Secondary: `#b000ff` (purple)
- Success: `#00ff88` (green)
- Danger: `#ff0055` (red)

**Typography:**
- Headers: Bold, 28-32px, letter-spacing 2px
- Nav items: 12px, letter-spacing 1px
- Data: Monospace font for financial values

## 🔒 Security Notes

1. **API Keys** - NEVER commit to GitHub
   - Use `.env` files (gitignored)
   - Use environment variables on Render/Vercel

2. **Auth** - Currently using simple token system
   - In production, implement:
     - Password hashing with bcrypt
     - JWT with expiration
     - HTTPS only cookies
     - Rate limiting

3. **CORS** - Configured for production URLs
   - Update `CLIENT_URL` for your domain

## 📊 Database (Future)

Currently using in-memory storage. For production:
1. Replace with PostgreSQL + Sequelize
2. Create migrations for Users, Orders, Stocks
3. Add connection pooling
4. Set up backups

## 🤝 Contributing

1. Fork repo
2. Create feature branch
3. Test locally
4. Push and create PR

## 📞 Support

- Backend issues: Check Render logs
- Frontend issues: Check Vercel logs
- API key issues: Verify at console.provider.com

## 📄 License

MIT

---

**Deployed:** 
- Frontend: [Your Vercel URL]
- Backend: [Your Render URL]
