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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-screener', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Initialize admin user on startup
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'inaamimran07@gmail.com' });
    if (!adminExists) {
      await User.create({
        email: 'inaamimran07@gmail.com',
        password: 'admin123',
        username: 'ADMIN',
        isAdmin: true,
        t212Connected: false,
      });
      console.log('✅ Admin user created');
    }

    const testExists = await User.findOne({ email: 'test@example.com' });
    if (!testExists) {
      await User.create({
        email: 'test@example.com',
        password: 'test123',
        username: 'TEST_USER',
        isAdmin: false,
        t212Connected: false,
      });
      console.log('✅ Test user created');
    }
  } catch (err) {
    console.error('Error initializing users:', err.message);
  }
};

mongoose.connection.once('open', () => {
  console.log('✅ MongoDB connected');
  initializeAdmin();
});

// JWT Secret
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

// ============ AUTH ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.json({ ok: false, error: 'Invalid credentials' });
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
      user: {
        id: user._id,
        email: user.email,
        t212Connected: user.t212Connected,
      },
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
          side: o.side, // BUY or SELL
          status: o.status, // ACTIVE, FILLED, etc
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

// ============ SCREENER ============
app.get('/api/screener/stocks', async (req, res) => {
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
      model: 'mixtral-8x7b-32768',
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
  res.json({ ok: true, message: 'Backend running with MongoDB' });
});

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Local'}`);
});
