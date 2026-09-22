const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const app = express();

// Enable CORS with proper headers
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_prod';
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

const client = new Anthropic();

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: String,
  username: { type: String, default: 'OPERATOR' },
  avatar: String,
  t212ApiKey: String,
  t212Connected: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  fromEmail: String,
  toEmail: String,
  text: String,
  image: String,
  gifUrl: String,
  video: String,
  messageType: { type: String, enum: ['text', 'image', 'gif', 'video'], default: 'text' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Create admin on startup
const createAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (!existingAdmin) {
      await User.create({
        email: 'inaamimran07@gmail.com',
        password: 'admin123',
        username: 'ADMIN',
        isAdmin: true,
        status: 'approved'
      });
      console.log('Admin user created');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  }
};

createAdminUser();

// Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};

// ============ AUTH ENDPOINTS ============

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ ok: false, error: 'User exists' });
    
    await User.create({ email, password, status: 'pending' });
    res.json({ ok: true, message: 'Signup successful! Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    
    if (!user) return res.status(400).json({ ok: false, error: 'Invalid credentials' });
    if (user.status === 'pending') return res.status(403).json({ ok: false, error: 'Awaiting admin approval' });
    if (user.status === 'denied') return res.status(403).json({ ok: false, error: 'Access denied' });
    
    const token = jwt.sign({ email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ USER ENDPOINTS ============

app.get('/api/users/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/users/profile', verifyToken, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { username, avatar },
      { new: true }
    );
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/users/connect-t212', verifyToken, async (req, res) => {
  try {
    const { t212ApiKey } = req.body;
    if (!t212ApiKey) return res.status(400).json({ ok: false, error: 'API key required' });
    
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { t212ApiKey, t212Connected: true },
      { new: true }
    );
    res.json({ ok: true, user, message: 'Trading212 connected successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/users/disconnect-t212', verifyToken, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { t212ApiKey: null, t212Connected: false },
      { new: true }
    );
    res.json({ ok: true, user, message: 'Trading212 disconnected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/users/avatar/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json({ ok: true, avatar: user?.avatar || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ ADMIN ENDPOINTS ============

app.get('/api/admin/pending-users', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.isAdmin) return res.status(403).json({ ok: false, error: 'Not admin' });
    
    const pendingUsers = await User.find({ status: 'pending' });
    res.json({ ok: true, users: pendingUsers });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/admin/all-users', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.isAdmin) return res.status(403).json({ ok: false, error: 'Not admin' });
    
    const allUsers = await User.find({});
    res.json({ ok: true, users: allUsers });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/approve/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.isAdmin) return res.status(403).json({ ok: false, error: 'Not admin' });
    
    const targetUser = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'approved' },
      { new: true }
    );
    res.json({ ok: true, user: targetUser });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/deny/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.isAdmin) return res.status(403).json({ ok: false, error: 'Not admin' });
    
    const targetUser = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'denied' },
      { new: true }
    );
    res.json({ ok: true, user: targetUser });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ PORTFOLIO ENDPOINTS ============

app.get('/api/portfolio/holdings', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.t212Connected || !user?.t212ApiKey) {
      return res.json({ ok: true, holdings: [] });
    }
    
    const holdingsRes = await axios.get('https://api.trading212.com/api/v0/holdings', {
      headers: { Authorization: user.t212ApiKey }
    });
    res.json({ ok: true, holdings: holdingsRes.data || [] });
  } catch (err) {
    console.error('T212 holdings error:', err.message);
    res.json({ ok: true, holdings: [] });
  }
});

app.get('/api/portfolio/orders', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.t212Connected || !user?.t212ApiKey) {
      return res.json({ ok: true, orders: [] });
    }
    
    const ordersRes = await axios.get('https://api.trading212.com/api/v0/orders', {
      headers: { Authorization: user.t212ApiKey }
    });
    res.json({ ok: true, orders: ordersRes.data || [] });
  } catch (err) {
    console.error('T212 orders error:', err.message);
    res.json({ ok: true, orders: [] });
  }
});

app.get('/api/portfolio/stats', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user?.t212Connected || !user?.t212ApiKey) {
      return res.json({ ok: true, stats: { totalValue: 0, cashBalance: 0, usedMargin: 0 } });
    }
    
    const accountRes = await axios.get('https://api.trading212.com/api/v0/account', {
      headers: { Authorization: user.t212ApiKey }
    });
    const data = accountRes.data;
    res.json({ ok: true, stats: {
      totalValue: data.equity || 0,
      cashBalance: data.cash || 0,
      usedMargin: (data.equity - data.cash) || 0
    }});
  } catch (err) {
    console.error('T212 stats error:', err.message);
    res.json({ ok: true, stats: { totalValue: 0, cashBalance: 0, usedMargin: 0 } });
  }
});

// ============ SCREENER ENDPOINTS ============

app.get('/api/screener/stocks', verifyToken, async (req, res) => {
  try {
    res.json({ ok: true, stocks: [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/data/stock/:ticker', verifyToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await axios.get(`https://api.twelvedata.com/quote`, {
      params: {
        symbol: ticker,
        apikey: TWELVE_DATA_API_KEY
      }
    });
    res.json({ ok: true, data: response.data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Stock not found' });
  }
});

app.get('/api/fundamentals/:ticker', verifyToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: ticker,
        token: FINNHUB_API_KEY
      }
    });
    res.json({ ok: true, fundamentals: response.data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Fundamentals not found' });
  }
});

app.get('/api/news', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: {
        q: 'stock market',
        sortBy: 'publishedAt',
        language: 'en',
        apiKey: NEWS_API_KEY,
        pageSize: 10
      }
    });
    res.json({ ok: true, news: response.data.articles || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ AI CHAT ENDPOINT (CLAUDE) ============

app.post('/api/ai/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ ok: false, error: 'Claude API key not configured' });
    }

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: 'You are an expert stock market analyst and financial advisor. Provide insightful, accurate information about stocks, trading strategies, and market trends. Be concise but informative.',
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    const reply = textContent?.text || 'No response';
    
    res.json({ ok: true, response: reply });
  } catch (err) {
    console.error('Claude API error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ MESSAGING ENDPOINTS ============

app.get('/api/users/all', verifyToken, async (req, res) => {
  try {
    const users = await User.find({ status: 'approved' }, 'email username avatar');
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/messages/send', verifyToken, async (req, res) => {
  try {
    const { toEmail, text, image, gifUrl, video, messageType } = req.body;
    const message = await Message.create({
      fromEmail: req.user.email,
      toEmail,
      text,
      image,
      gifUrl,
      video,
      messageType
    });
    res.json({ ok: true, message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/messages/:otherEmail', verifyToken, async (req, res) => {
  try {
    const { otherEmail } = req.params;
    const messages = await Message.find({
      $or: [
        { fromEmail: req.user.email, toEmail: otherEmail },
        { fromEmail: otherEmail, toEmail: req.user.email }
      ]
    }).sort({ createdAt: 1 });
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server is running' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
