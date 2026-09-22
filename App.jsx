import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');

  // Fetch user on mount
  useEffect(() => {
    if (token) {
      fetchUser();
      setPage('dashboard');
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setUser(data.user);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // LOGIN PAGE
  if (!token) {
    return <LoginPage onLogin={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
  }

  // SIDEBAR NAVIGATION
  const Sidebar = () => (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-icon">⚙️</div>
        <h1>SCREENER</h1>
      </div>
      
      <nav className="nav-items">
        <button 
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <BarChart3 size={18} />
          DASHBOARD
        </button>
        <button 
          className={`nav-item ${page === 'screener' ? 'active' : ''}`}
          onClick={() => setPage('screener')}
        >
          <LineChart size={18} />
          SCREENER
        </button>
        <button 
          className={`nav-item ${page === 'orders' ? 'active' : ''}`}
          onClick={() => setPage('orders')}
        >
          <TrendingUp size={18} />
          ORDERS
        </button>
        <button 
          className={`nav-item ${page === 'ai' ? 'active' : ''}`}
          onClick={() => setPage('ai')}
        >
          <MessageSquare size={18} />
          AI ASSISTANT
        </button>
        {user?.isAdmin && (
          <button 
            className={`nav-item ${page === 'admin' ? 'active' : ''}`}
            onClick={() => setPage('admin')}
          >
            <Settings size={18} />
            ADMIN PANEL
          </button>
        )}
      </nav>

      <div className="user-section">
        <div className="user-profile">
          <div className="avatar">👤</div>
          <div className="user-info">
            <p className="username">{user?.username || 'OPERATOR_99'}</p>
            <p className="level">LEVEL 4 ACCESS</p>
          </div>
        </div>
        <button className="logout-btn" onClick={() => { setToken(null); setPage('login'); }}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  // DASHBOARD PAGE
  if (page === 'dashboard') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>PORTFOLIO OVERVIEW</h2>
            <p className="subtitle">STABLE ORBITAL LINK // QUANTUM TICKER ACTIVE</p>
          </header>

          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">TOTAL VALUE</p>
              <h3>$1,284,592.00</h3>
              <p className="stat-detail">+$12.5K LATENCY DELTA</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">TODAY'S GAIN</p>
              <h3 className="positive">+$12,847.32</h3>
              <p className="stat-detail">+1.01% SYSTEM INDEX</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">ROI METRIC</p>
              <h3 className="highlight">24.7%</h3>
              <p className="stat-detail">ANNUAL HARMONIC RATE</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">HOLDINGS COUNT</p>
              <h3>18 ASSETS</h3>
              <p className="stat-detail">6 CRYPTO // 12 STOCKS</p>
            </div>
          </div>

          <div className="portfolio-section">
            <div className="holdings-container">
              <h3>ACTIVE POSITION ANALYSIS</h3>
              <table className="holdings-table">
                <thead>
                  <tr>
                    <th>TICKER</th>
                    <th>QUANTITY</th>
                    <th>ENTRY PRICE</th>
                    <th>CURRENT</th>
                    <th>GAIN/LOSS</th>
                    <th>% CHANGE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticker: 'AAPL', qty: 140, entry: 172.50, current: 189.84, gain: 2427.60, change: 2.25 },
                    { ticker: 'TSLA', qty: 85, entry: 210.40, current: 197.20, gain: -1122.00, change: -6.28 },
                    { ticker: 'NVDA', qty: 205, entry: 420.00, current: 875.12, gain: 93300.00, change: 108.3 },
                    { ticker: 'MSFT', qty: 90, entry: 350.10, current: 415.50, gain: 5886.00, change: 18.68 },
                    { ticker: 'AMZN', qty: 110, entry: 145.20, current: 178.15, gain: 3624.50, change: 22.69 },
                  ].map((h, i) => (
                    <tr key={i} className={h.change > 0 ? 'positive' : 'negative'}>
                      <td className="ticker">{h.ticker}</td>
                      <td>{h.qty}</td>
                      <td>${h.entry.toFixed(2)}</td>
                      <td>${h.current.toFixed(2)}</td>
                      <td className={h.gain > 0 ? 'gain' : 'loss'}>${h.gain.toFixed(2)}</td>
                      <td className={h.change > 0 ? 'gain-text' : 'loss-text'}>
                        {h.change > 0 ? '📈' : '📉'} {h.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="alerts-container">
              <h3>MARKET ALERTS</h3>
              <div className="alerts-list">
                <div className="alert critical">
                  <span className="alert-icon">⚡</span>
                  <div>
                    <p className="alert-title">CRITICAL</p>
                    <p className="alert-text">FED RATIO QUANTUM CALALYSIS COMPLETED</p>
                    <p className="alert-time">00:41</p>
                  </div>
                </div>
                <div className="alert warning">
                  <span className="alert-icon">⚠️</span>
                  <div>
                    <p className="alert-title">VOLATILITY</p>
                    <p className="alert-text">NVDA CHIP SUPPLY REACHES MARS STATION</p>
                    <p className="alert-time">10:15</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCREENER PAGE
  if (page === 'screener') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>STOCK SCREENER</h2>
            <p className="subtitle">FILTER DEEP TECH MATRIX // QUANTUM INDEX CRITERIA ACTIVE</p>
          </header>

          <div className="filter-section">
            <div className="filter-group">
              <label>STOCK FILTER PROFILE</label>
              <select>
                <option>Professional Score >75</option>
                <option>Halal Only</option>
                <option>All Stocks</option>
              </select>
            </div>
            <div className="filter-group">
              <label>PRICE TARGET RANGE</label>
              <input type="range" min="0" max="10000" />
              <p>$0 - $10,000</p>
            </div>
            <div className="filter-group">
              <label>P/E RATIO MAX</label>
              <input type="range" min="0" max="100" />
              <p>0 - 100</p>
            </div>
            <button className="apply-btn">APPLY FILTERS</button>
          </div>

          <table className="screener-table">
            <thead>
              <tr>
                <th>TICKER ↑</th>
                <th>PRICE</th>
                <th>CHANGE %</th>
                <th>P/E</th>
                <th>ROE</th>
                <th>D/E</th>
                <th>YOY GROWTH</th>
                <th>HALAL</th>
                <th>SCORE ↓</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, de: 0.12, yoy: 220, halal: true, score: 94 },
                { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, de: 1.45, yoy: 8.5, halal: true, score: 82 },
                { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, de: 0.30, yoy: 17.0, halal: true, score: 88 },
                { ticker: 'TSLA', price: 197.20, change: -6.28, pe: 42.7, roe: 21.1, de: 0.08, yoy: -15.4, halal: false, score: 61 },
                { ticker: 'AMZN', price: 178.15, change: 22.69, pe: 58.2, roe: 18.9, de: 0.41, yoy: 12.1, halal: true, score: 79 },
              ].map((s, i) => (
                <tr key={i}>
                  <td className="ticker">• {s.ticker}</td>
                  <td>${s.price.toFixed(2)}</td>
                  <td className={s.change > 0 ? 'positive' : 'negative'}>{s.change > 0 ? '+' : ''}{s.change.toFixed(2)}%</td>
                  <td>{s.pe}</td>
                  <td>{s.roe.toFixed(1)}%</td>
                  <td>{s.de.toFixed(2)}</td>
                  <td>{s.yoy > 0 ? '+' : ''}{s.yoy}%</td>
                  <td className={s.halal ? 'halal-yes' : 'halal-no'}>{s.halal ? '[YES]' : '[NO]'}</td>
                  <td className="score">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pagination">Showing 1-8 of 2,340 stocks // MATRIX COMPLETED IN 2.1MS</p>
        </div>
      </div>
    );
  }

  // ORDERS PAGE
  if (page === 'orders') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>ORDERS & POSITIONS</h2>
            <p className="subtitle">EXECUTE COLD TICKER ORDER ENGINE // HIGH FREQUENCY QUEUE</p>
          </header>

          <div className="order-creation">
            <h3>INITIATE COLD TRANSACTION</h3>
            <div className="order-tabs">
              <button className="tab-btn active">BUY_PROTOCOL</button>
              <button className="tab-btn">SELL_PROTOCOL</button>
            </div>
            <div className="order-form">
              <input type="text" placeholder="NVDA" defaultValue="NVDA" className="symbol-input" />
              <input type="number" placeholder="875.12" className="price-input" />
              <input type="number" placeholder="50" className="qty-input" />
              <button className="execute-btn">EXECUTE TRANSACTION</button>
            </div>
          </div>

          <div className="orders-section">
            <h3>ACTIVE TRANSACTION PIPELINE</h3>
            <div className="orders-grid">
              <div className="order-item">
                <p className="order-type buy">BUY</p>
                <p className="order-info">AAPL $189.00 x 100</p>
                <p className="order-status">ACTIVE</p>
                <button className="cancel-btn">CANCEL</button>
              </div>
              <div className="order-item">
                <p className="order-type sell">SELL</p>
                <p className="order-info">TSLA $198.50 x 40</p>
                <p className="order-status">PARTIAL</p>
                <button className="cancel-btn">CANCEL</button>
              </div>
            </div>
          </div>

          <div className="history-section">
            <h3>HISTORICAL FILL LOG</h3>
            <div className="history-list">
              <div className="history-item">
                <p className="time">10:14:02</p>
                <p className="type buy">BUY</p>
                <p className="ticker">NVDA</p>
                <p className="price">$870.00 x 10</p>
                <p className="status">COMPLETED</p>
              </div>
              <div className="history-item">
                <p className="time">09:30:11</p>
                <p className="type sell">SELL</p>
                <p className="ticker">MSFT</p>
                <p className="price">$412.00 x 20</p>
                <p className="status">COMPLETED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI ASSISTANT PAGE
  if (page === 'ai') {
    const handleAiChat = async () => {
      if (!aiInput.trim()) return;
      
      setAiChat([...aiChat, { role: 'user', text: aiInput }]);
      setAiInput('');
      
      try {
        const res = await fetch(`${BACKEND_URL}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: aiInput,
            context: 'You are analyzing a stock portfolio with various holdings and market data.'
          })
        });
        const data = await res.json();
        setAiChat(prev => [...prev, { role: 'assistant', text: data.response }]);
      } catch (err) {
        setAiChat(prev => [...prev, { role: 'assistant', text: 'Error connecting to AI service' }]);
      }
    };

    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>AI MARKET ANALYST</h2>
            <p className="subtitle">INTELLIGENT PORTFOLIO OVERVIEW // ASK QUESTIONS ABOUT YOUR STOCKS</p>
          </header>

          <div className="ai-chat-container">
            <div className="chat-messages">
              {aiChat.length === 0 ? (
                <div className="welcome-message">
                  <h3>Welcome to AI Assistant</h3>
                  <p>Ask me about:</p>
                  <p>• Your portfolio performance</p>
                  <p>• Stock screener results</p>
                  <p>• Market news & analysis</p>
                  <p>• Halal compliance screening</p>
                </div>
              ) : (
                aiChat.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <p>{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                placeholder="Ask about stocks, portfolio, or market analysis..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
                className="ai-input"
              />
              <button onClick={handleAiChat} className="send-btn">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN PANEL
  if (page === 'admin' && user?.isAdmin) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>ADMIN CONTROLS</h2>
            <p className="subtitle">SECURITY TERMINAL OVERRIDE // CLASSIFIED GATEWAY ACTIVE</p>
          </header>

          <div className="admin-section">
            <div className="pending-users">
              <h3>PENDING REGISTER PROTOCOLS (3 PENDING)</h3>
              <div className="user-list">
                <div className="user-item">
                  <p>alpha.dev@matrix.tech</p>
                  <p className="date">Requested: 2025-01-25</p>
                  <div className="actions">
                    <button className="approve-btn">APPROVE</button>
                    <button className="deny-btn">DENY</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="verified-users">
              <h3>VERIFIED OPERATORS</h3>
              <div className="user-list">
                <div className="user-item active">
                  <p>admin.screener@internal.com</p>
                  <p className="date">Verified: 2025-01-01</p>
                  <span className="active-badge">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// LOGIN PAGE COMPONENT
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/auth/signup' : '/auth/login';
    
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.ok && data.token) {
        onLogin(data.token);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">⚙️</div>
          <h1>SCREENER</h1>
          <p className="subtitle">PROFESSIONAL STOCK SCREENING</p>
        </div>

        <div className="security-protocol">
          SECURITY PROTOCOL: v3.45.9
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input
              type="email"
              placeholder="operator@screener.tech"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="sys-ok">SYS_OK</span>
          </div>

          <div className="form-group">
            <label>PASSPHRASE DECRYPT</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="sys-ok">SYS_OK</span>
          </div>

          <button type="submit" className="login-btn">
            INITIATE SYSTEM SESSION
          </button>

          <p className="toggle-auth">
            {isRegister ? 'Already have access? ' : "Don't have an access key? "}
            <button type="button" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign in' : 'Register Operator'}
            </button>
          </p>

          <p className="terminal">TERMINAL: 01 A COLD LINK</p>
        </form>
      </div>
    </div>
  );
}

export default App;
