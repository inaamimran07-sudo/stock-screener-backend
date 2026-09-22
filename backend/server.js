require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// API Keys
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

// Simple in-memory storage (replace with database for production)
const users = {};
const orders = {};
const stocks = {};

// Seed database with test users on startup
const seedDatabase = () => {
  // Admin account (auto-approved)
  users[ADMIN_EMAIL] = {
    email: ADMIN_EMAIL,
    password: 'admin123',
    isAdmin: true,
    isApproved: true,
    username: 'Admin',
    avatar: null
  };

  // Test user account (auto-approved for testing)
  users['test@example.com'] = {
    email: 'test@example.com',
    password: 'test123',
    isAdmin: false,
    isApproved: true,
    username: 'TestUser',
    avatar: null
  };

  console.log('✓ Database seeded with test users');
  console.log(`  Admin: ${ADMIN_EMAIL} / admin123`);
  console.log('  Test: test@example.com / test123');
};

// Call seed on startup
seedDatabase();

// Authentication
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }
  
  if (users[email]) {
    return res.status(400).json({ ok: false, error: 'User already exists' });
  }
  
  // Check if email is admin email
  const isAdmin = email === ADMIN_EMAIL;
  
  users[email] = {
    email,
    password, // In production, hash this with bcrypt
    isAdmin: isAdmin,
    isApproved: isAdmin, // Auto-approve if admin email
    username: null,
    avatar: null
  };
  
  res.json({
    ok: true,
    status: isAdmin ? 'Admin account created' : 'Account created - awaiting approval'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }
  
  const user = users[email];
  
  if (!user) {
    return res.status(401).json({ ok: false, error: 'User not found' });
  }
  
  if (user.password !== password) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }
  
  if (!user.isApproved) {
    return res.status(403).json({ ok: false, error: 'Account pending approval' });
  }
  
  res.json({
    ok: true,
    token: Buffer.from(email).toString('base64'),
    user: {
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      isAdmin: user.isAdmin
    }
  });
});

// Stock Data - Finnhub
app.get('/api/stocks/quote/:ticker', async (req, res) => {
  try {
    const response = await axios.get('https://finnhub.io/api/v1/quote', {
      params: {
        symbol: req.params.ticker,
        token: FINNHUB_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stocks/company/:ticker', async (req, res) => {
  try {
    const response = await axios.get('https://finnhub.io/api/v1/stock/profile2', {
      params: {
        symbol: req.params.ticker,
        token: FINNHUB_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock Screening - Halal Filter
app.get('/api/stocks/screen', async (req, res) => {
  try {
    const { halal, minScore } = req.query;
    
    // Mock screened stocks - in production, integrate with real data
    const screenedStocks = [
      {
        ticker: 'NVDA',
        price: 875.12,
        change: 108.3,
        pe: 74.2,
        roe: 91.4,
        de: 0.12,
        yoyGrowth: 220,
        halal: true,
        score: 94
      },
      {
        ticker: 'AAPL',
        price: 189.84,
        change: 7.2,
        pe: 28.1,
        roe: 154.3,
        de: 1.45,
        yoyGrowth: 8.5,
        halal: true,
        score: 82
      },
      {
        ticker: 'MSFT',
        price: 415.50,
        change: 18.68,
        pe: 35.4,
        roe: 38.5,
        de: 0.30,
        yoyGrowth: 17.0,
        halal: true,
        score: 88
      },
      {
        ticker: 'TSLA',
        price: 197.20,
        change: -6.28,
        pe: 42.7,
        roe: 21.1,
        de: 0.08,
        yoyGrowth: -15.4,
        halal: false,
        score: 61
      },
      {
        ticker: 'AMZN',
        price: 178.15,
        change: 22.69,
        pe: 58.2,
        roe: 18.9,
        de: 0.41,
        yoyGrowth: 12.1,
        halal: true,
        score: 79
      }
    ];
    
    let filtered = screenedStocks;
    if (halal === 'true') {
      filtered = filtered.filter(s => s.halal);
    }
    if (minScore) {
      filtered = filtered.filter(s => s.score >= parseInt(minScore));
    }
    
    res.json({ ok: true, stocks: filtered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// News
app.get('/api/news/:ticker', async (req, res) => {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: req.params.ticker,
        apiKey: NEWS_API_KEY,
        pageSize: 10,
        sortBy: 'publishedAt'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat with Groq
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: `You are a professional stock market analyst. Help analyze stocks, portfolios, and market news. ${context || ''}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      ok: true,
      response: response.data.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders
app.post('/api/orders/create', (req, res) => {
  const { type, ticker, price, quantity } = req.body;
  const orderId = Date.now().toString();
  
  orders[orderId] = {
    id: orderId,
    type,
    ticker,
    price,
    quantity,
    status: 'ACTIVE',
    createdAt: new Date()
  };
  
  res.json({ ok: true, order: orders[orderId] });
});

app.get('/api/orders', (req, res) => {
  const orderList = Object.values(orders).filter(o => o.status === 'ACTIVE');
  res.json({ ok: true, orders: orderList });
});

// User Profile
app.get('/api/users/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  
  const email = Buffer.from(token, 'base64').toString();
  const user = users[email];
  
  if (!user) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  res.json({
    ok: true,
    user: {
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      isAdmin: user.isAdmin
    }
  });
});

app.post('/api/users/set-username', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { username } = req.body;
  
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  
  const email = Buffer.from(token, 'base64').toString();
  const user = users[email];
  
  if (!user) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  user.username = username;
  res.json({ ok: true, message: 'Username set' });
});

// Admin - Pending Users
app.get('/api/auth/pending-users', (req, res) => {
  const pending = Object.values(users).filter(u => !u.isApproved);
  res.json({ ok: true, pending });
});

app.post('/api/auth/approve-user/:email', (req, res) => {
  const user = users[req.params.email];
  if (!user) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  user.isApproved = true;
  res.json({ ok: true, message: 'User approved' });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'Server is running', userCount: Object.keys(users).length });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API base: http://localhost:${PORT}/api`);
});

module.exports = { app, server, io };
