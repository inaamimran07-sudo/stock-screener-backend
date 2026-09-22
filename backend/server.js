require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors());

// In-memory storage (replace with DB in production)
const users = {
  'inaamimran07@gmail.com': {
    id: 1,
    email: 'inaamimran07@gmail.com',
    password: 'admin123',
    username: 'ADMIN',
    avatar: null,
    isAdmin: true,
    t212ApiKey: null,
    t212Connected: false
  },
  'test@example.com': {
    id: 2,
    email: 'test@example.com',
    password: 'test123',
    username: 'TRADER',
    avatar: null,
    isAdmin: false,
    t212ApiKey: null,
    t212Connected: false
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};

// ========== AUTH ENDPOINTS ==========

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin } });
});

// ========== USER ENDPOINTS ==========

app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = Object.values(users).find(u => u.email === req.userEmail);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  
  res.json({ 
    ok: true, 
    user: { 
      id: user.id, 
      email: user.email, 
      username: user.username, 
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      t212Connected: user.t212Connected
    } 
  });
});

// Update user profile (name, avatar, etc.)
app.put('/api/users/profile', authMiddleware, (req, res) => {
  const { username, avatar } = req.body;
  const user = Object.values(users).find(u => u.email === req.userEmail);
  
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  
  if (username) user.username = username;
  if (avatar) user.avatar = avatar; // Base64 image data
  
  res.json({ ok: true, user: { username: user.username, avatar: user.avatar } });
});

// Get user's avatar
app.get('/api/users/avatar/:email', (req, res) => {
  const user = users[req.params.email];
  if (!user || !user.avatar) {
    return res.json({ ok: true, avatar: null });
  }
  res.json({ ok: true, avatar: user.avatar });
});

// ========== TRADING212 API ENDPOINTS ==========

// Connect Trading212 account
app.post('/api/users/connect-t212', authMiddleware, async (req, res) => {
  const { apiKey } = req.body;
  const user = Object.values(users).find(u => u.email === req.userEmail);
  
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'API key required' });
  }
  
  try {
    // Test API key by making a request to T212
    const response = await axios.get('https://api.trading212.com/api/v0/accounts', {
      headers: { 'Authorization': apiKey }
    });
    
    // Store encrypted key (in production, use proper encryption)
    user.t212ApiKey = apiKey;
    user.t212Connected = true;
    
    res.json({ ok: true, message: 'Trading212 connected successfully' });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Invalid API key or T212 error' });
  }
});

// Disconnect Trading212
app.post('/api/users/disconnect-t212', authMiddleware, (req, res) => {
  const user = Object.values(users).find(u => u.email === req.userEmail);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  
  user.t212ApiKey = null;
  user.t212Connected = false;
  
  res.json({ ok: true, message: 'Trading212 disconnected' });
});

// ========== PORTFOLIO ENDPOINTS (Real T212 Data) ==========

// Get portfolio holdings from T212
app.get('/api/portfolio/holdings', authMiddleware, async (req, res) => {
  const user = Object.values(users).find(u => u.email === req.userEmail);
  
  if (!user || !user.t212Connected || !user.t212ApiKey) {
    return res.json({ 
      ok: true, 
      holdings: [],
      message: 'Trading212 not connected. Connect your account to see holdings.'
    });
  }
  
  try {
    const response = await axios.get('https://api.trading212.com/api/v0/accounts/me/portfolio', {
      headers: { 'Authorization': user.t212ApiKey }
    });
    
    res.json({ ok: true, holdings: response.data });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Failed to fetch holdings from T212' });
  }
});

// Get portfolio orders from T212
app.get('/api/portfolio/orders', authMiddleware, async (req, res) => {
  const user = Object.values(users).find(u => u.email === req.userEmail);
  
  if (!user || !user.t212Connected || !user.t212ApiKey) {
    return res.json({ 
      ok: true, 
      orders: [],
      message: 'Trading212 not connected. Connect your account to see orders.'
    });
  }
  
  try {
    const response = await axios.get('https://api.trading212.com/api/v0/accounts/me/orders', {
      headers: { 'Authorization': user.t212ApiKey }
    });
    
    res.json({ ok: true, orders: response.data });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Failed to fetch orders from T212' });
  }
});

// Get portfolio stats
app.get('/api/portfolio/stats', authMiddleware, async (req, res) => {
  const user = Object.values(users).find(u => u.email === req.userEmail);
  
  if (!user || !user.t212Connected || !user.t212ApiKey) {
    return res.json({ 
      ok: true, 
      stats: { totalValue: 0, todayGain: 0, roi: 0 },
      message: 'Connect Trading212 to see real portfolio data'
    });
  }
  
  try {
    const response = await axios.get('https://api.trading212.com/api/v0/accounts/me', {
      headers: { 'Authorization': user.t212ApiKey }
    });
    
    const data = response.data;
    res.json({ 
      ok: true, 
      stats: {
        totalValue: data.equity || 0,
        cashBalance: data.freeToWithdraw || 0,
        usedMargin: data.usedMargin || 0
      }
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Failed to fetch stats from T212' });
  }
});

// ========== SCREENER ENDPOINTS ==========

// Get stock data for screener
app.get('/api/screener/stocks', authMiddleware, async (req, res) => {
  const { filter, peMax } = req.query;
  
  try {
    // Using Finnhub API (free tier available)
    // Get top stocks
    const stocks = [
      { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, score: 94 },
      { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, score: 82 },
      { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, score: 88 },
    ];
    
    res.json({ ok: true, stocks });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to fetch stock data' });
  }
});

// ========== AI ASSISTANT ENDPOINTS ==========

app.post('/api/ai/chat', authMiddleware, async (req, res) => {
  const { message } = req.body;
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    return res.status(500).json({ 
      ok: false, 
      error: 'AI service not configured. Add GROQ_API_KEY to .env'
    });
  }
  
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: 'You are a helpful financial advisor and stock market analyst.' },
        { role: 'user', content: message }
      ],
      max_tokens: 300
    }, {
      headers: { 'Authorization': `Bearer ${groqApiKey}` }
    });
    
    const aiResponse = response.data.choices[0].message.content;
    res.json({ ok: true, response: aiResponse });
  } catch (err) {
    console.error('Groq API error:', err.response?.data || err.message);
    res.status(500).json({ 
      ok: false, 
      error: 'AI service error',
      details: err.response?.data?.error?.message || err.message
    });
  }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'Server is running' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
