import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send } from 'lucide-react';
import SettingsModal from './SettingsModal';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Dashboard data
  const [holdings, setHoldings] = useState([]);
  const [stats, setStats] = useState({ totalValue: 0, cashBalance: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch holdings
      const holdingsRes = await fetch(`${BACKEND_URL}/portfolio/holdings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const holdingsData = await holdingsRes.json();
      if (holdingsData.ok) {
        setHoldings(holdingsData.holdings || []);
      }

      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/portfolio/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.ok) {
        setStats(statsData.stats || {});
      }

      // Fetch orders
      const ordersRes = await fetch(`${BACKEND_URL}/portfolio/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.ok) {
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    }
    setLoading(false);
  }, [token]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setUser(data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUser();
      setPage('dashboard');
    }
  }, [token, fetchUser]);

  // Fetch portfolio data when user changes or T212 connects
  useEffect(() => {
    if (token && user?.t212Connected && page === 'dashboard') {
      fetchPortfolioData();
    }
  }, [token, user?.t212Connected, page, fetchPortfolioData]);

  if (!token) {
    return <LoginPage onLogin={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
  }

  if (showSettings) {
    return (
      <SettingsModal 
        onClose={() => { setShowSettings(false); fetchUser(); }} 
        user={user} 
      />
    );
  }

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
          <BarChart3 size={18} /> DASHBOARD
        </button>
        <button 
          className={`nav-item ${page === 'screener' ? 'active' : ''}`}
          onClick={() => setPage('screener')}
        >
          <LineChart size={18} /> SCREENER
        </button>
        <button 
          className={`nav-item ${page === 'orders' ? 'active' : ''}`}
          onClick={() => setPage('orders')}
        >
          <TrendingUp size={18} /> ORDERS
        </button>
        <button 
          className={`nav-item ${page === 'ai' ? 'active' : ''}`}
          onClick={() => setPage('ai')}
        >
          <MessageSquare size={18} /> AI ASSISTANT
        </button>
        {user?.isAdmin && (
          <button 
            className={`nav-item ${page === 'admin' ? 'active' : ''}`}
            onClick={() => setPage('admin')}
          >
            <Settings size={18} /> ADMIN
          </button>
        )}
      </nav>

      <div className="user-section">
        <div className="user-profile">
          <div className="avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '2px' }} />
            ) : (
              '👤'
            )}
          </div>
          <div className="user-info">
            <p className="username">{user?.username || 'OPERATOR'}</p>
            <p className="level">{user?.t212Connected ? '🟢 CONNECTED' : '⚠️ NOT CONNECTED'}</p>
          </div>
        </div>
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button 
          className="logout-btn" 
          onClick={() => { setToken(null); localStorage.removeItem('token'); }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  if (page === 'dashboard') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>PORTFOLIO OVERVIEW</h2>
            <p className="subtitle">
              {user?.t212Connected ? '🟢 TRADING212 CONNECTED' : '⚠️ CONNECT TRADING212 FOR REAL DATA'}
            </p>
          </header>

          {user?.t212Connected && loading && (
            <div className="loading">Loading portfolio data...</div>
          )}

          {user?.t212Connected ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <p className="stat-label">TOTAL VALUE</p>
                  <h3>${(stats.totalValue || 0).toFixed(2)}</h3>
                  <p className="stat-detail">Real T212 Data</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">CASH BALANCE</p>
                  <h3 className="positive">${(stats.cashBalance || 0).toFixed(2)}</h3>
                  <p className="stat-detail">Available</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">USED MARGIN</p>
                  <h3 className="highlight">${(stats.usedMargin || 0).toFixed(2)}</h3>
                  <p className="stat-detail">Invested</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">HOLDINGS</p>
                  <h3>{holdings.length} ASSETS</h3>
                  <p className="stat-detail">From T212</p>
                </div>
              </div>

              <div className="portfolio-section">
                <div className="holdings-container">
                  <h3>ACTIVE POSITIONS ({holdings.length})</h3>
                  {holdings.length > 0 ? (
                    <table className="holdings-table">
                      <thead>
                        <tr>
                          <th>TICKER</th>
                          <th>QTY</th>
                          <th>VALUE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h, i) => (
                          <tr key={i}>
                            <td className="ticker">{h.ticker || h.symbol || 'N/A'}</td>
                            <td>{(h.quantity || h.qty || 0).toFixed(2)}</td>
                            <td>${(h.value || h.currentPrice || 0).toFixed(2)}</td>
                            <td className="positive">ACTIVE</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">No holdings yet</p>
                  )}
                </div>

                <div className="alerts-container">
                  <h3>STATUS</h3>
                  <div className="alerts-list">
                    <div className="alert critical">
                      <span className="alert-icon">✅</span>
                      <div>
                        <p className="alert-title">CONNECTED</p>
                        <p className="alert-text">Trading212 Account Linked</p>
                        <p className="alert-time">Real-time</p>
                      </div>
                    </div>
                    <div className="alert warning">
                      <span className="alert-icon">ℹ️</span>
                      <div>
                        <p className="alert-title">INFO</p>
                        <p className="alert-text">Data refreshes every 5 mins</p>
                        <p className="alert-time">Auto</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-connection">
              <h3>⚠️ Trading212 Not Connected</h3>
              <p>Connect your Trading212 account to see real portfolio data</p>
              <button 
                className="connect-btn" 
                onClick={() => setShowSettings(true)}
              >
                CONNECT NOW
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              <label>FILTER</label>
              <select><option>All Stocks</option><option>Halal Only</option></select>
            </div>
            <div className="filter-group">
              <label>P/E MAX</label>
              <input type="range" min="0" max="100" defaultValue="50" />
            </div>
            <div className="filter-group">
              <label>PRICE MIN</label>
              <input type="number" defaultValue="10" />
            </div>
            <button className="apply-btn">APPLY</button>
          </div>

          <table className="screener-table">
            <thead>
              <tr>
                <th>TICKER</th>
                <th>PRICE</th>
                <th>CHANGE</th>
                <th>P/E</th>
                <th>ROE</th>
                <th>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ticker: 'NVDA', price: 875.12, change: 108.3, pe: 74.2, roe: 91.4, score: 94 },
                { ticker: 'AAPL', price: 189.84, change: 7.2, pe: 28.1, roe: 154.3, score: 82 },
                { ticker: 'MSFT', price: 415.50, change: 18.68, pe: 35.4, roe: 38.5, score: 88 },
                { ticker: 'TSLA', price: 197.20, change: -6.28, pe: 42.7, roe: 21.1, score: 61 },
                { ticker: 'AMZN', price: 178.15, change: 22.69, pe: 58.2, roe: 18.9, score: 79 },
              ].map((s, i) => (
                <tr key={i}>
                  <td className="ticker">{s.ticker}</td>
                  <td>${s.price}</td>
                  <td className={s.change > 0 ? 'positive' : 'negative'}>{s.change > 0 ? '+' : ''}{s.change}%</td>
                  <td>{s.pe}</td>
                  <td>{s.roe}%</td>
                  <td className="score">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (page === 'orders') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>ORDERS & POSITIONS</h2>
            <p className="subtitle">
              {user?.t212Connected ? '🟢 LIVE ORDERS FROM TRADING212' : '⚠️ CONNECT T212 TO SEE ORDERS'}
            </p>
          </header>

          {user?.t212Connected ? (
            <>
              <div className="order-creation">
                <h3>CREATE ORDER</h3>
                <div className="order-form">
                  <input type="text" placeholder="NVDA" defaultValue="NVDA" className="symbol-input" />
                  <input type="number" placeholder="875.12" className="price-input" />
                  <input type="number" placeholder="50" className="qty-input" />
                  <button className="execute-btn">EXECUTE</button>
                </div>
              </div>

              <div className="orders-section">
                <h3>ACTIVE ORDERS ({orders.length})</h3>
                {orders.length > 0 ? (
                  <div className="orders-grid">
                    {orders.map((order, i) => (
                      <div key={i} className="order-item">
                        <p className="order-type" style={{ background: order.side === 'BUY' ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,85,0.2)', color: order.side === 'BUY' ? '#00ff88' : '#ff0055' }}>
                          {order.side || 'PENDING'}
                        </p>
                        <p>{order.symbol || 'N/A'} @ ${(order.limitPrice || order.price || 0).toFixed(2)}</p>
                        <p className="order-status">{order.status || 'ACTIVE'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No active orders</p>
                )}
              </div>
            </>
          ) : (
            <div className="no-connection">
              <h3>⚠️ Trading212 Not Connected</h3>
              <p>Connect your Trading212 account to see real orders</p>
              <button 
                className="connect-btn" 
                onClick={() => setShowSettings(true)}
              >
                CONNECT NOW
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (page === 'ai') {
    const handleAiChat = async () => {
      if (!aiInput.trim()) return;
      
      setAiChat([...aiChat, { role: 'user', text: aiInput }]);
      const userMessage = aiInput;
      setAiInput('');

      try {
        const res = await fetch(`${BACKEND_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: userMessage })
        });
        const data = await res.json();
        
        if (data.ok) {
          setAiChat(prev => [...prev, { role: 'assistant', text: data.response }]);
        } else {
          setAiChat(prev => [...prev, { 
            role: 'assistant', 
            text: `Error: ${data.error || 'AI service error'}. Make sure GROQ_API_KEY is set in backend.` 
          }]);
        }
      } catch (err) {
        console.error('AI error:', err);
        setAiChat(prev => [...prev, { 
          role: 'assistant', 
          text: 'Connection error. Make sure backend is running.' 
        }]);
      }
    };

    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>AI MARKET ANALYST</h2>
            <p className="subtitle">INTELLIGENT PORTFOLIO OVERVIEW</p>
          </header>

          <div className="ai-chat-container">
            <div className="chat-messages">
              {aiChat.length === 0 ? (
                <div className="welcome-message">
                  <h3>AI Assistant Ready</h3>
                  <p>Ask about stocks, portfolio, or market trends</p>
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
                placeholder="Ask about stocks..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
                className="ai-input"
              />
              <button onClick={handleAiChat} className="send-btn"><Send size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'admin' && user?.isAdmin) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>ADMIN CONTROLS</h2>
            <p className="subtitle">SECURITY TERMINAL OVERRIDE</p>
          </header>

          <div className="admin-section">
            <div className="pending-users">
              <h3>PENDING USERS</h3>
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
                  <p>admin@screener.com</p>
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

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
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

        <div className="security-protocol">SECURITY PROTOCOL: v3.45.9</div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input
              type="email"
              placeholder="operator@screener.tech"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              required
            />
            <span className="sys-ok">SYS_OK</span>
          </div>

          <button type="submit" className="login-btn">INITIATE SYSTEM SESSION</button>

          <p className="terminal">TERMINAL: 01 A COLD LINK</p>
          <p className="hint">Demo: inaamimran07@gmail.com / admin123</p>
        </form>
      </div>
    </div>
  );
}

export default App;
