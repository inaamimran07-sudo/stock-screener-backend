import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send, Search } from 'lucide-react';
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

  // Screener data
  const [screenerSearch, setScreenerSearch] = useState('');
  const [screenerResults, setScreenerResults] = useState([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [peFilter, setPeFilter] = useState(100);
  const [priceFilter, setPriceFilter] = useState(0);

  // Admin data
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    try {
      const holdingsRes = await fetch(`${BACKEND_URL}/portfolio/holdings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const holdingsData = await holdingsRes.json();
      if (holdingsData.ok) setHoldings(holdingsData.holdings || []);

      const statsRes = await fetch(`${BACKEND_URL}/portfolio/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.ok) setStats(statsData.stats || {});

      const ordersRes = await fetch(`${BACKEND_URL}/portfolio/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.ok) setOrders(ordersData.orders || []);
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

  const fetchAdminData = useCallback(async () => {
    try {
      const pendingRes = await fetch(`${BACKEND_URL}/admin/pending-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pendingData = await pendingRes.json();
      if (pendingData.ok) setPendingUsers(pendingData.users || []);

      const allRes = await fetch(`${BACKEND_URL}/admin/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allData = await allRes.json();
      if (allData.ok) setAllUsers(allData.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, [token]);

  const searchStock = async () => {
    if (!screenerSearch.trim()) return;
    
    setScreenerLoading(true);
    try {
      const ticker = screenerSearch.toUpperCase();
      
      // Fetch stock data
      const stockRes = await fetch(`${BACKEND_URL}/data/stock/${ticker}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stockData = await stockRes.json();

      // Fetch fundamentals
      const fundRes = await fetch(`${BACKEND_URL}/fundamentals/${ticker}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fundData = await fundRes.json();

      if (stockData.ok && fundData.ok) {
        const price = parseFloat(stockData.data?.price) || 0;
        const change = parseFloat(stockData.data?.change) || 0;
        const pe = parseFloat(fundData.fundamentals?.pe) || null;
        const high52 = parseFloat(fundData.fundamentals?.['52WeekHigh'] || fundData.fundamentals?.highPrice52Week) || null;
        const low52 = parseFloat(fundData.fundamentals?.['52WeekLow'] || fundData.fundamentals?.lowPrice52Week) || null;
        
        setScreenerResults([{
          ticker: ticker,
          price: price,
          change: change,
          changePercent: (change / price * 100) || 0,
          pe: pe,
          roe: 'N/A',
          score: Math.floor(Math.random() * 100),
          high52: high52,
          low52: low52,
        }]);
      } else {
        setScreenerResults([]);
        alert('Stock not found. Please check the ticker and try again.');
      }
    } catch (err) {
      console.error('Error searching stock:', err);
      alert('Error fetching stock data. Make sure APIs are configured.');
    }
    setScreenerLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchUser();
      setPage('dashboard');
    }
  }, [token, fetchUser]);

  useEffect(() => {
    if (token && user?.t212Connected && page === 'dashboard') {
      fetchPortfolioData();
    }
  }, [token, user?.t212Connected, page, fetchPortfolioData]);

  useEffect(() => {
    if (token && user?.isAdmin && page === 'admin') {
      fetchAdminData();
    }
  }, [token, user?.isAdmin, page, fetchAdminData]);

  if (!token) {
    return <AuthPage onLogin={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
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
    const filteredResults = screenerResults.filter(stock => {
      const peValue = typeof stock.pe === 'number' ? stock.pe : 0;
      return stock.price >= priceFilter && (peValue === 0 || peValue <= peFilter);
    });

    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>STOCK SCREENER</h2>
            <p className="subtitle">SEARCH & ANALYZE REAL-TIME STOCK DATA</p>
          </header>

          <div className="filter-section">
            <div className="search-group">
              <label>SEARCH TICKER</label>
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="e.g., NVDA, AAPL, MSFT"
                  value={screenerSearch}
                  onChange={(e) => setScreenerSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchStock()}
                />
                <button 
                  className="search-btn"
                  onClick={searchStock}
                  disabled={screenerLoading}
                >
                  <Search size={18} /> {screenerLoading ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label>P/E MAX: {peFilter}</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={peFilter}
                onChange={(e) => setPeFilter(Number(e.target.value))}
              />
            </div>

            <div className="filter-group">
              <label>PRICE MIN: ${priceFilter}</label>
              <input 
                type="range" 
                min="0" 
                max="500" 
                value={priceFilter}
                onChange={(e) => setPriceFilter(Number(e.target.value))}
              />
            </div>
          </div>

          {screenerLoading ? (
            <div className="loading">Fetching real-time data...</div>
          ) : filteredResults.length > 0 ? (
            <table className="screener-table">
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>PRICE</th>
                  <th>CHANGE</th>
                  <th>P/E</th>
                  <th>52W HIGH</th>
                  <th>52W LOW</th>
                  <th>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((stock, i) => (
                  <tr key={i}>
                    <td className="ticker">{stock.ticker}</td>
                    <td>${typeof stock.price === 'number' ? stock.price.toFixed(2) : 'N/A'}</td>
                    <td className={stock.change > 0 ? 'positive' : 'negative'}>
                      {stock.change > 0 ? '+' : ''}{typeof stock.change === 'number' ? stock.change.toFixed(2) : 'N/A'}%
                    </td>
                    <td>{typeof stock.pe === 'number' ? stock.pe.toFixed(2) : 'N/A'}</td>
                    <td>${typeof stock.high52 === 'number' ? stock.high52.toFixed(2) : 'N/A'}</td>
                    <td>${typeof stock.low52 === 'number' ? stock.low52.toFixed(2) : 'N/A'}</td>
                    <td className="score">{stock.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-message" style={{ textAlign: 'center', padding: '40px' }}>
              <p>Search for a stock ticker to see real-time data</p>
              <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.6 }}>Try: NVDA, AAPL, MSFT, TSLA, AMZN</p>
            </div>
          )}
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
            text: `Error: ${data.error || 'AI service error'}` 
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
    const handleApprove = async (userId) => {
      try {
        const res = await fetch(`${BACKEND_URL}/admin/approve/${userId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
          fetchAdminData();
        }
      } catch (err) {
        console.error('Error approving user:', err);
      }
    };

    const handleDeny = async (userId) => {
      try {
        const res = await fetch(`${BACKEND_URL}/admin/deny/${userId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
          fetchAdminData();
        }
      } catch (err) {
        console.error('Error denying user:', err);
      }
    };

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
              <h3>PENDING USERS ({pendingUsers.length})</h3>
              <div className="user-list">
                {pendingUsers.length > 0 ? (
                  pendingUsers.map(u => (
                    <div key={u.id} className="user-item">
                      <p>{u.email}</p>
                      <p className="date">Requested: {new Date(u.createdAt).toLocaleDateString()}</p>
                      <div className="actions">
                        <button className="approve-btn" onClick={() => handleApprove(u.id)}>APPROVE</button>
                        <button className="deny-btn" onClick={() => handleDeny(u.id)}>DENY</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">No pending users</p>
                )}
              </div>
            </div>

            <div className="verified-users">
              <h3>ALL USERS ({allUsers.length})</h3>
              <div className="user-list">
                {allUsers.map(u => (
                  <div key={u.id} className={`user-item ${u.status === 'approved' ? 'active' : ''}`}>
                    <p>{u.email}</p>
                    <p className="date">Status: {u.status.toUpperCase()}</p>
                    <span className={u.status === 'approved' ? 'active-badge' : 'pending-badge'}>
                      {u.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function AuthPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('✅ ' + data.message);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsSignup(false), 2000);
      } else {
        setError(data.error || 'Signup failed');
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
        {message && <div className="success-message">{message}</div>}

        {!isSignup ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="your@email.com"
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
            <p className="hint">
              New user? <button type="button" className="link-btn" onClick={() => setIsSignup(true)}>SIGN UP HERE</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="sys-ok">SYS_OK</span>
            </div>

            <div className="form-group">
              <label>PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="sys-ok">SYS_OK</span>
            </div>

            <div className="form-group">
              <label>CONFIRM PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <span className="sys-ok">SYS_OK</span>
            </div>

            <button type="submit" className="login-btn">CREATE ACCOUNT</button>

            <p className="terminal">TERMINAL: 01 A COLD LINK</p>
            <p className="hint">
              Already have account? <button type="button" className="link-btn" onClick={() => setIsSignup(false)}>LOGIN HERE</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
