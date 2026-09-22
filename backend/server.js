const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-screener';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  username: { type: String, default: 'OPERATOR' },
  avatar: { type: String, default: null },
  t212ApiKey: { type: String, default: null },
  t212Connected: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Initialize admin
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'inaamimran07@gmail.com' });
    if (!adminExists) {
      await User.create({
        email: 'inaamimran07@gmail.com',
        password: 'admin123',
        username: 'ADMIN',
        isAdmin: true,
        status: 'approved',
        t212Connected: false,
      });
      console.log('✅ Admin user created');
    }
  } catch (err) {
    console.error('Error initializing admin:', err.message);
  }
};

setTimeout(initializeAdmin, 2000);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ ok: false, error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.json({ ok: false, error: 'Invalid token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ ok: false, error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user?.isAdmin) return res.json({ ok: false, error: 'Admin only' });
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.json({ ok: false, error: 'Unauthorized' });
  }
};

// ============ AUTH ============
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ ok: false, error: 'Email and password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ ok: false, error: 'Email already exists' });
    }
    const newUser = await User.create({
      email,
      password,
      username: email.split('@')[0],
      status: 'pending',
      isAdmin: false,
    });
    res.json({
      ok: true,
      message: 'Signup successful! Waiting for admin approval.',
      user: { id: newUser._id, email: newUser.email, status: newUser.status },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.json({ ok: false, error: 'Invalid credentials' });
    }
    if (user.status === 'pending') {
      return res.json({ ok: false, error: 'Your account is pending admin approval' });
    }
    if (user.status === 'denied') {
      return res.json({ ok: false, error: 'Your account has been denied' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        t212Connected: user.t212Connected,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ============ USERS ============
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.json({ ok: false, error: 'User not found' });
    res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        t212Connected: user.t212Connected,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { username: username || 'OPERATOR', avatar },
      { new: true }
    );
    res.json({
      ok: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        t212Connected: user.t212Connected,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/users/avatar/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user || !user.avatar) {
      return res.json({ ok: false, error: 'Avatar not found' });
    }
    res.json({ ok: true, avatar: user.avatar });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ============ TRADING212 ============
app.post('/api/users/connect-t212', authMiddleware, async (req, res) => {
  try {
    const { t212ApiKey } = req.body;
    if (!t212ApiKey) return res.json({ ok: false, error: 'API key required' });
    const user = await User.findByIdAndUpdate(
      req.userId,
      { t212ApiKey, t212Connected: true },
      { new: true }
    );
    res.json({
      ok: true,
      message: 'Trading212 connected',
      user: { id: user._id, email: user.email, t212Connected: user.t212Connected },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/users/disconnect-t212', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { t212ApiKey: null, t212Connected: false },
      { new: true }
    );
    res.json({
      ok: true,
      message: 'Trading212 disconnected',
      user: { id: user._id, t212Connected: false },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ============ ADMIN ============
app.get('/api/admin/pending-users', adminMiddleware, async (req, res) => {
  try {
    const pending = await User.find({ status: 'pending' });
    res.json({
      ok: true,
      users: pending.map(u => ({
        id: u._id,
        email: u.email,
        username: u.username,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/admin/all-users', adminMiddleware, async (req, res) => {
  try {
    const all = await User.find({});
    res.json({
      ok: true,
      users: all.map(u => ({
        id: u._id,
        email: u.email,
        username: u.username,
        status: u.status,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/approve/:userId', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'approved' },
      { new: true }
    );
    res.json({
      ok: true,
      message: `${user.email} approved`,
      user: { id: user._id, email: user.email, status: user.status },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/deny/:userId', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'denied' },
      { new: true }
    );
    res.json({
      ok: true,
      message: `${user.email} denied`,
      user: { id: user._id, email: user.email, status: user.status },
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ============ PORTFOLIO (T212) ============
app.get('/api/portfolio/holdings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.t212Connected || !user.t212ApiKey) {
      return res.json({
        ok: false,
        error: 'Trading212 not connected',
        holdings: [],
      });
    }
    try {
      const response = await axios.get('https://api.trading212.com/api/v0/equity/portfolio/', {
        headers: { Authorization: user.t212ApiKey },
      });
      res.json({
        ok: true,
        holdings: response.data?.map((h) => ({
          ticker: h.ticker || h.code,
          symbol: h.code,
          quantity: h.quantity,
          qty: h.quantity,
          value: h.quantity * h.currentPrice,
          currentPrice: h.currentPrice,
          status: 'ACTIVE',
        })) || [],
      });
    } catch (err) {
      res.json({
        ok: false,
        error: 'Failed to fetch from Trading212',
        holdings: [],
      });
    }
  } catch (err) {
    res.json({ ok: false, error: err.message, holdings: [] });
  }
});

app.get('/api/portfolio/orders', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.t212Connected || !user.t212ApiKey) {
      return res.json({ ok: false, error: 'Trading212 not connected', orders: [] });
    }
    try {
      const response = await axios.get('https://api.trading212.com/api/v0/equity/orders/', {
        headers: { Authorization: user.t212ApiKey },
      });
      res.json({
        ok: true,
        orders: response.data?.map((o) => ({
          id: o.id,
          symbol: o.ticker || o.code,
          quantity: o.quantity,
          price: o.limitPrice || o.filledPrice,
          limitPrice: o.limitPrice,
          side: o.side,
          status: o.status,
        })) || [],
      });
    } catch (err) {
      res.json({
        ok: false,
        error: 'Failed to fetch from Trading212',
        orders: [],
      });
    }
  } catch (err) {
    res.json({ ok: false, error: err.message, orders: [] });
  }
});

app.get('/api/portfolio/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.t212Connected || !user.t212ApiKey) {
      return res.json({
        ok: false,
        error: 'Trading212 not connected',
        stats: { totalValue: 0, cashBalance: 0, usedMargin: 0 },
      });
    }
    try {
      const accountResponse = await axios.get('https://api.trading212.com/api/v0/account/cash/', {
        headers: { Authorization: user.t212ApiKey },
      });
      const portfolioResponse = await axios.get('https://api.trading212.com/api/v0/equity/portfolio/', {
        headers: { Authorization: user.t212ApiKey },
      });
      const totalValue = portfolioResponse.data?.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0) || 0;
      const cashBalance = accountResponse.data?.free || 0;
      res.json({
        ok: true,
        stats: {
          totalValue: totalValue + cashBalance,
          cashBalance,
          usedMargin: totalValue,
        },
      });
    } catch (err) {
      res.json({
        ok: false,
        error: 'Failed to fetch from Trading212',
        stats: { totalValue: 0, cashBalance: 0, usedMargin: 0 },
      });
    }
  } catch (err) {
    res.json({
      ok: false,
      error: err.message,
      stats: { totalValue: 0, cashBalance: 0, usedMargin: 0 },
    });
  }
});

// ============ SCREENER (with Twelve Data) ============
app.get('/api/screener/stocks', async (req, res) => {
  try {
    const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    
    if (!twelveDataKey) {
      // Return hardcoded data if no API key
      return res.json({
        ok: true,
        stocks: [
          { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, score: 94 },
          { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, score: 82 },
          { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, score: 88 },
          { ticker: 'TSLA', price: 197.20, change: -6.28, pe: 42.7, roe: 21.1, score: 61 },
          { ticker: 'AMZN', price: 178.15, change: 22.69, pe: 58.2, roe: 18.9, score: 79 },
        ],
      });
    }

    // Try to fetch from Twelve Data
    const tickers = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN'];
    const stocks = [];

    for (const ticker of tickers) {
      try {
        const response = await axios.get(`https://api.twelvedata.com/quote`, {
          params: {
            symbol: ticker,
            apikey: twelveDataKey,
          },
        });

        if (response.data) {
          stocks.push({
            ticker: ticker,
            price: parseFloat(response.data.close) || 0,
            change: parseFloat(response.data.change) || 0,
            pe: parseFloat(response.data.pe) || 'N/A',
            roe: parseFloat(response.data.roe) || 'N/A',
            score: Math.floor(Math.random() * 100),
          });
        }
      } catch (err) {
        // If one ticker fails, continue with others
        continue;
      }
    }

    res.json({
      ok: true,
      stocks: stocks.length > 0 ? stocks : [
        { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, score: 94 },
        { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, score: 82 },
        { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, score: 88 },
        { ticker: 'TSLA', price: 197.20, change: -6.28, pe: 42.7, roe: 21.1, score: 61 },
        { ticker: 'AMZN', price: 178.15, change: 22.69, pe: 58.2, roe: 18.9, score: 79 },
      ],
    });
  } catch (err) {
    res.json({
      ok: true,
      stocks: [
        { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, score: 94 },
        { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, score: 82 },
        { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, score: 88 },
        { ticker: 'TSLA', price: 197.20, change: -6.28, pe: 42.7, roe: 21.1, score: 61 },
        { ticker: 'AMZN', price: 178.15, change: 22.69, pe: 58.2, roe: 18.9, score: 79 },
      ],
    });
  }
});

// ============ STOCK DATA (Twelve Data) ============
app.get('/api/data/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const twelveDataKey = process.env.TWELVE_DATA_API_KEY;

    if (!twelveDataKey) {
      return res.json({ ok: false, error: 'Twelve Data API key not configured' });
    }

    const response = await axios.get(`https://api.twelvedata.com/quote`, {
      params: {
        symbol: ticker,
        apikey: twelveDataKey,
      },
    });

    res.json({
      ok: true,
      data: {
        symbol: ticker,
        price: response.data.close,
        change: response.data.change,
        changePercent: response.data.percent_change,
        high: response.data.high,
        low: response.data.low,
        volume: response.data.volume,
        timestamp: response.data.timestamp,
      },
    });
  } catch (err) {
    res.json({ ok: false, error: 'Failed to fetch stock data: ' + err.message });
  }
});

// ============ NEWS (News API) ============
app.get('/api/news', async (req, res) => {
  try {
    const { query } = req.query;
    const newsApiKey = process.env.NEWS_API_KEY;

    if (!newsApiKey) {
      return res.json({ ok: false, error: 'News API key not configured', articles: [] });
    }

    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: {
        q: query || 'stock market',
        sortBy: 'publishedAt',
        language: 'en',
        apiKey: newsApiKey,
      },
    });

    res.json({
      ok: true,
      articles: response.data.articles?.slice(0, 10).map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.urlToImage,
        source: article.source.name,
        publishedAt: article.publishedAt,
      })) || [],
    });
  } catch (err) {
    res.json({ ok: false, error: 'Failed to fetch news: ' + err.message, articles: [] });
  }
});

// ============ FUNDAMENTALS (Finnhub) ============
app.get('/api/fundamentals/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const finnhubKey = process.env.FINNHUB_API_KEY;

    if (!finnhubKey) {
      return res.json({ ok: false, error: 'Finnhub API key not configured' });
    }

    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: ticker,
        token: finnhubKey,
      },
    });

    res.json({
      ok: true,
      fundamentals: {
        symbol: ticker,
        price: response.data.c,
        highPrice52Week: response.data.h52,
        lowPrice52Week: response.data.l52,
        marketCap: response.data.mc,
        pe: response.data.pe || 'N/A',
        timestamp: response.data.t,
      },
    });
  } catch (err) {
    res.json({ ok: false, error: 'Failed to fetch fundamentals: ' + err.message });
  }
});

// ============ AI ASSISTANT (Groq) ============
app.post('/api/ai/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ ok: false, error: 'Message required' });

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.json({
        ok: false,
        error: 'GROQ_API_KEY not set in backend environment',
      });
    }

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful stock market analyst assistant. Answer questions about stocks, trading, and investing briefly and clearly.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 500,
    }, {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const aiResponse = response.data?.choices?.[0]?.message?.content || 'No response from AI';

    res.json({
      ok: true,
      response: aiResponse,
    });
  } catch (err) {
    console.error('Groq error:', err.response?.data || err.message);
    res.json({
      ok: false,
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

// ============ HEALTH ============
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend running with MongoDB and all APIs' });
});

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB: Connecting...`);
  console.log(`📈 Twelve Data: ${process.env.TWELVE_DATA_API_KEY ? '✅' : '⚠️'}`);
  console.log(`📰 News API: ${process.env.NEWS_API_KEY ? '✅' : '⚠️'}`);
  console.log(`📊 Finnhub: ${process.env.FINNHUB_API_KEY ? '✅' : '⚠️'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});
