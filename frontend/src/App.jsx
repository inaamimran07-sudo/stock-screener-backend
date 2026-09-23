import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send, Search, Image as ImageIcon, Smile } from 'lucide-react';
import SettingsModal from './SettingsModal';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const GIPHY_API_KEY = 'YOUR_GIPHY_KEY'; // Free tier: https://developers.giphy.com/

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
  const [screenerCache, setScreenerCache] = useState({}); // Cache of searched stocks
  const [selectedStock, setSelectedStock] = useState(null); // For detailed view/orders
  const [orderModal, setOrderModal] = useState(false); // Order execution modal
  const [orderData, setOrderData] = useState({ ticker: '', quantity: 0, direction: 'BUY', orderType: 'MARKET' });
  const [profileZoom, setProfileZoom] = useState({}); // For chat profile pic zoom - { email: true/false }
  const [adminEditUser, setAdminEditUser] = useState(null); // Admin editing user
  const [adminEditData, setAdminEditData] = useState({ username: '', avatar: null });
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [peFilter, setPeFilter] = useState(100);
  const [priceFilter, setPriceFilter] = useState(0);

  // Messaging data
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [gifSearch, setGifSearch] = useState('');

  // Admin data
  const [pendingUsers, setPendingUsers] = useState([]);
  const [adminAllUsers, setAdminAllUsers] = useState([]);



  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchPortfolioData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const holdingsRes = await fetch(`${BACKEND_URL}/portfolio/holdings`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const holdingsData = await holdingsRes.json();
      if (holdingsData.ok) setHoldings(holdingsData.holdings || []);

      const statsRes = await fetch(`${BACKEND_URL}/portfolio/stats`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const statsData = await statsRes.json();
      if (statsData.ok) setStats(statsData.stats || {});

      const ordersRes = await fetch(`${BACKEND_URL}/portfolio/orders`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.ok) setOrders(ordersData.orders || []);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    }
    setLoading(false);
  }, [token]);

  const fetchUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.ok) setUser(data.user);
      else console.error('Fetch error:', data.error);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }, [token]);

  const fetchAllUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/users/all`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.ok) setAllUsers(data.users.filter(u => u.email !== user?.email) || []);
      else console.error('Fetch error:', data.error);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [token, user?.email]);

  const fetchMessages = useCallback(async (otherEmail) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/messages/${otherEmail}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.ok) setMessages(data.messages || []);
      else console.error('Fetch error:', data.error);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [token]);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    try {
      const pendingRes = await fetch(`${BACKEND_URL}/admin/pending-users`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const pendingData = await pendingRes.json();
      if (pendingData.ok) setPendingUsers(pendingData.users || []);

      const allRes = await fetch(`${BACKEND_URL}/admin/all-users`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const allData = await allRes.json();
      if (allData.ok) setAdminAllUsers(allData.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, [token]);

  const searchGifs = async (query) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?q=${query}&limit=10&api_key=${GIPHY_API_KEY}`
      );
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Giphy error:', err);
    }
  };

  const sendMessage = async (type = 'text', content = null) => {
    if (!selectedUser) return;
    if (type === 'text' && !messageInput.trim()) return;

    try {
      let payload = {
        toEmail: selectedUser.email,
        messageType: type
      };

      if (type === 'text') {
        payload.text = messageInput;
      } else if (type === 'image') {
        payload.image = content;
      } else if (type === 'gif') {
        payload.gifUrl = content;
      }

      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessageInput('');
        setShowGifPicker(false);
        fetchMessages(selectedUser.email);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        sendMessage('image', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser();
      setPage('dashboard');
    } else {
      setPage('login');
    }
  }, [token, fetchUser]);

  useEffect(() => {
    if (token && user?.t212Connected && page === 'dashboard') {
      fetchPortfolioData();
    }
  }, [token, user?.t212Connected, page, fetchPortfolioData]);

  useEffect(() => {
    if (token && page === 'messages') {
      fetchAllUsers();
    }
  }, [token, page, fetchAllUsers]);

  useEffect(() => {
    if (token && user?.isAdmin && page === 'admin') {
      fetchAdminData();
    }
  }, [token, user?.isAdmin, page, fetchAdminData]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.email);
      const interval = setInterval(() => fetchMessages(selectedUser.email), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedUser, token, fetchMessages]);

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
          className={`nav-item ${page === 'messages' ? 'active' : ''}`}
          onClick={() => { setPage('messages'); setSelectedUser(null); }}
        >
          <MessageSquare size={18} /> MESSAGES
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
                  onKeyPress={(e) => e.key === 'Enter' && (() => {
                    if (!screenerSearch.trim()) return;
                    
                    const ticker = screenerSearch.toUpperCase();
                    
                    // Check cache first
                    if (screenerCache[ticker]) {
                      setScreenerResults([screenerCache[ticker]]);
                      setSelectedStock(screenerCache[ticker]);
                      return;
                    }
                    
                    setScreenerLoading(true);
                    
                    Promise.all([
                      fetch(`${BACKEND_URL}/data/stock/${ticker}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      }),
                      fetch(`${BACKEND_URL}/fundamentals/${ticker}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                    ]).then(async ([stockRes, fundRes]) => {
                      const stockData = await stockRes.json();
                      const fundData = await fundRes.json();

                      if (stockData.ok && fundData.ok) {
                        const price = parseFloat(stockData.data?.close) || 0;
                        const changePercent = parseFloat(stockData.data?.percent_change) || 0;
                        
                        const stock = {
                          ticker: ticker,
                          price: price,
                          change: changePercent,
                          changePercent: changePercent,
                          pe: fundData.fundamentals?.pe || 'N/A',
                          roe: fundData.fundamentals?.roe || 'N/A',
                          dividend: fundData.fundamentals?.dividend || 0,
                          marketCap: fundData.fundamentals?.marketCap || 'N/A',
                          industry: fundData.fundamentals?.industry || 'N/A',
                          score: Math.round(fundData.fundamentals?.score || 50),
                          high52: fundData.fundamentals?.high52w || 'N/A',
                          low52: fundData.fundamentals?.low52w || 'N/A',
                        };
                        
                        setScreenerResults([stock]);
                        setScreenerCache(prev => ({ ...prev, [ticker]: stock }));
                        setSelectedStock(stock);
                      } else {
                        setScreenerResults([]);
                        alert('Stock not found.');
                      }
                      setScreenerLoading(false);
                    }).catch(err => {
                      console.error('Error:', err);
                      setScreenerLoading(false);
                    });
                  })()}
                />
                <button 
                  className="search-btn"
                  onClick={() => {
                    if (!screenerSearch.trim()) return;
                    
                    const ticker = screenerSearch.toUpperCase();
                    
                    // Check cache first
                    if (screenerCache[ticker]) {
                      setScreenerResults([screenerCache[ticker]]);
                      return;
                    }
                    
                    setScreenerLoading(true);
                    
                    Promise.all([
                      fetch(`${BACKEND_URL}/data/stock/${ticker}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      }),
                      fetch(`${BACKEND_URL}/fundamentals/${ticker}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                    ]).then(async ([stockRes, fundRes]) => {
                      const stockData = await stockRes.json();
                      const fundData = await fundRes.json();

                      if (stockData.ok && fundData.ok) {
                        const price = parseFloat(stockData.data?.close) || 0;
                        const changePercent = parseFloat(stockData.data?.percent_change) || 0;
                        
                        const stock = {
                          ticker: ticker,
                          price: price,
                          change: changePercent,
                          changePercent: changePercent,
                          pe: fundData.fundamentals?.pe || 'N/A',
                          roe: fundData.fundamentals?.roe || 'N/A',
                          dividend: fundData.fundamentals?.dividend || 0,
                          marketCap: fundData.fundamentals?.marketCap || 'N/A',
                          industry: fundData.fundamentals?.industry || 'N/A',
                          score: Math.round(fundData.fundamentals?.score || 50),
                          high52: fundData.fundamentals?.high52w || 'N/A',
                          low52: fundData.fundamentals?.low52w || 'N/A',
                        };
                        
                        setScreenerResults([stock]);
                        setScreenerCache(prev => ({ ...prev, [ticker]: stock })); // Cache it
                        setSelectedStock(stock); // Auto-select for detailed view
                      } else {
                        setScreenerResults([]);
                        alert('Stock not found.');
                      }
                      setScreenerLoading(false);
                    }).catch(err => {
                      console.error('Error:', err);
                      setScreenerLoading(false);
                    });
                  }}
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
                  <th>ROE</th>
                  <th>DIVIDEND</th>
                  <th>52W HIGH</th>
                  <th>52W LOW</th>
                  <th>SCORE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((stock, i) => (
                  <tr key={i} onClick={() => setSelectedStock(stock)} style={{ cursor: 'pointer' }}>
                    <td className="ticker">{stock.ticker}</td>
                    <td>${typeof stock.price === 'number' ? stock.price.toFixed(2) : 'N/A'}</td>
                    <td className={stock.change > 0 ? 'positive' : 'negative'}>
                      {stock.change > 0 ? '+' : ''}{typeof stock.change === 'number' ? stock.change.toFixed(2) : 'N/A'}%
                    </td>
                    <td>{typeof stock.pe === 'number' ? stock.pe.toFixed(2) : 'N/A'}</td>
                    <td>{typeof stock.roe === 'number' ? stock.roe.toFixed(2) + '%' : 'N/A'}</td>
                    <td>{typeof stock.dividend === 'number' ? (stock.dividend * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td>${typeof stock.high52 === 'number' ? stock.high52.toFixed(2) : 'N/A'}</td>
                    <td>${typeof stock.low52 === 'number' ? stock.low52.toFixed(2) : 'N/A'}</td>
                    <td className="score" title={`Score: ${stock.score}/100 - Based on professional metrics (P/E, ROE, Dividend Yield, Growth)`}>{stock.score}</td>
                    <td>
                      <button 
                        className="action-btn buy-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderData({ ticker: stock.ticker, quantity: 1, direction: 'BUY', orderType: 'MARKET' });
                          setOrderModal(true);
                        }}
                      >BUY</button>
                      <button 
                        className="action-btn sell-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderData({ ticker: stock.ticker, quantity: 1, direction: 'SELL', orderType: 'MARKET' });
                          setOrderModal(true);
                        }}
                      >SELL</button>
                    </td>
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

  if (page === 'messages') {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>MESSAGING</h2>
            <p className="subtitle">CHAT WITH OTHER USERS</p>
          </header>

          <div className="messaging-container" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
            {/* Users List */}
            <div style={{ flex: '0 0 250px', borderRight: '1px solid #00ff88', overflowY: 'auto', paddingRight: '15px' }}>
              <h3 style={{ color: '#00ff88', marginBottom: '15px' }}>USERS ONLINE</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allUsers.map(u => (
                  <button
                    key={u.email}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      padding: '10px',
                      border: selectedUser?.email === u.email ? '2px solid #00ff88' : '1px solid #00ff8844',
                      background: selectedUser?.email === u.email ? 'rgba(0,255,136,0.1)' : 'transparent',
                      color: '#00ff88',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '2px',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{u.username || u.email}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>{u.email}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            {selectedUser ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ borderBottom: '1px solid #00ff8844', paddingBottom: '10px' }}>
                  <h3 style={{ color: '#00ff88' }}>{selectedUser.username || selectedUser.email}</h3>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: msg.fromEmail === user.email ? 'right' : 'left',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: msg.fromEmail === user.email ? 'flex-end' : 'flex-start',
                        gap: '8px'
                      }}
                    >
                      {/* Profile picture - left side for others */}
                      {msg.fromEmail !== user.email && (
                        <div 
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: '#00ff88',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transform: profileZoom[msg.fromEmail] ? 'scale(2)' : 'scale(1)',
                            transition: 'transform 0.3s ease'
                          }}
                          onClick={() => setProfileZoom(prev => ({ ...prev, [msg.fromEmail]: !prev[msg.fromEmail] }))}
                        >
                          <img 
                            src={users.find(u => u.email === msg.fromEmail)?.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='30' r='20' fill='%23000'/%3E%3Cellipse cx='50' cy='70' rx='30' ry='25' fill='%23000'/%3E%3C/svg%3E`}
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      
                      <div
                        style={{
                          display: 'inline-block',
                          maxWidth: '60%',
                          padding: '10px 15px',
                          borderRadius: '4px',
                          background: msg.fromEmail === user.email ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,85,0.2)',
                          border: `1px solid ${msg.fromEmail === user.email ? '#00ff88' : '#ff0055'}`,
                          color: msg.fromEmail === user.email ? '#00ff88' : '#ff0055',
                          fontSize: '13px',
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.messageType === 'text' && <p>{msg.text}</p>}
                        {msg.messageType === 'image' && <img src={msg.image} alt="shared" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '2px' }} />}
                        {msg.messageType === 'gif' && <img src={msg.gifUrl} alt="gif" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '2px' }} />}
                        <p style={{ fontSize: '10px', opacity: 0.7, marginTop: '5px' }}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Profile picture - right side for current user */}
                      {msg.fromEmail === user.email && (
                        <div 
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: '#00ff88',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transform: profileZoom[user.email] ? 'scale(2)' : 'scale(1)',
                            transition: 'transform 0.3s ease'
                          }}
                          onClick={() => setProfileZoom(prev => ({ ...prev, [user.email]: !prev[user.email] }))}
                        >
                          <img 
                            src={userAvatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='30' r='20' fill='%23000'/%3E%3Cellipse cx='50' cy='70' rx='30' ry='25' fill='%23000'/%3E%3C/svg%3E`}
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* GIF Picker Modal */}
                {showGifPicker && (
                  <div style={{
                    position: 'absolute',
                    bottom: '150px',
                    right: '50px',
                    background: '#0a0e27',
                    border: '1px solid #00ff88',
                    borderRadius: '4px',
                    padding: '10px',
                    zIndex: 100,
                    width: '300px'
                  }}>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Search GIFs..."
                        value={gifSearch}
                        onChange={(e) => setGifSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchGifs(gifSearch)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#00ff8811',
                          border: '1px solid #00ff88',
                          color: '#00ff88',
                          borderRadius: '2px'
                        }}
                      />
                      <button
                        onClick={() => searchGifs(gifSearch)}
                        style={{
                          padding: '5px 10px',
                          background: '#00ff88',
                          color: '#000',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        Search
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {gifs.map(gif => (
                        <button
                          key={gif.id}
                          onClick={() => {
                            sendMessage('gif', gif.images.fixed_height.url);
                          }}
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}
                        >
                          <img src={gif.images.fixed_height.url} alt="gif" style={{ width: '100%', height: 'auto' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage('text')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#00ff8811',
                      border: '1px solid #00ff88',
                      color: '#00ff88',
                      borderRadius: '2px'
                    }}
                  />
                  <label style={{ cursor: 'pointer', color: '#00ff88' }}>
                    <ImageIcon size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0,255,136,0.2)',
                      border: '1px solid #00ff88',
                      color: '#00ff88',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                  >
                    <Smile size={18} />
                  </button>
                  <button
                    onClick={() => sendMessage('text')}
                    style={{
                      padding: '8px 12px',
                      background: '#00ff88',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#00ff8844' }}>Select a user to start messaging</p>
              </div>
            )}
          </div>
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
      <>
        <div className="app-container">
          <Sidebar />
          <div className="main-content">
            <header className="header">
              <h2>AI MARKET ANALYST</h2>
              <p className="subtitle">INTELLIGENT PORTFOLIO OVERVIEW (CLAUDE 3.5)</p>
            </header>

          <div className="ai-chat-container">
            <div className="chat-messages">
              {aiChat.length === 0 ? (
                <div className="welcome-message">
                  <h3>Claude 3.5 Sonnet Ready</h3>
                  <p>Ask about stocks, portfolio, or market trends. Now with Claude AI for better insights!</p>
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
      </>
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
                    <div key={u._id} className="user-item">
                      <p>{u.email}</p>
                      <p className="date">Requested: {new Date(u.createdAt).toLocaleDateString()}</p>
                      <div className="actions">
                        <button className="approve-btn" onClick={() => handleApprove(u._id)}>APPROVE</button>
                        <button className="deny-btn" onClick={() => handleDeny(u._id)}>DENY</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">No pending users</p>
                )}
              </div>
            </div>

            <div className="verified-users">
              <h3>ALL USERS ({adminAllUsers.length})</h3>
              <div className="user-list">
                {adminAllUsers.map(u => (
                  <div key={u._id} className={`user-item ${u.status === 'approved' ? 'active' : ''}`}>
                    <p>{u.email}</p>
                    <p className="date">Status: {u.status.toUpperCase()}</p>
                    <span className={u.status === 'approved' ? 'active-badge' : 'pending-badge'}>
                      {u.status.toUpperCase()}
                    </span>
                    <button 
                      className="edit-btn"
                      onClick={() => {
                        setAdminEditUser(u);
                        setAdminEditData({ username: u.username || 'OPERATOR', avatar: u.avatar || null });
                      }}
                    >EDIT</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ORDER EXECUTION MODAL */}
      {orderModal && (
        <div className="modal-overlay" onClick={() => setOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>EXECUTE ORDER</h2>
            <div className="form-group">
              <label>TICKER</label>
              <input type="text" value={orderData.ticker} disabled />
            </div>
            <div className="form-group">
              <label>DIRECTION</label>
              <select value={orderData.direction} onChange={(e) => setOrderData({...orderData, direction: e.target.value})}>
                <option>BUY</option>
                <option>SELL</option>
              </select>
            </div>
            <div className="form-group">
              <label>QUANTITY</label>
              <input type="number" min="1" value={orderData.quantity} onChange={(e) => setOrderData({...orderData, quantity: parseInt(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>ORDER TYPE</label>
              <select value={orderData.orderType} onChange={(e) => setOrderData({...orderData, orderType: e.target.value})}>
                <option>MARKET</option>
                <option>LIMIT</option>
              </select>
            </div>
            <button className="execute-btn" onClick={async () => {
              try {
                const res = await fetch(`${BACKEND_URL}/orders/execute`, {
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(orderData)
                });
                const data = await res.json();
                if (data.ok) {
                  alert(`Order executed! Order ID: ${data.orderId}`);
                  setOrderModal(false);
                } else {
                  alert('Order failed: ' + (data.error || 'Unknown error'));
                }
              } catch (err) {
                alert('Error executing order: ' + err.message);
              }
            }}>CONFIRM ORDER</button>
            <button className="cancel-btn" onClick={() => setOrderModal(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* ADMIN EDIT USER MODAL */}
      {adminEditUser && (
        <div className="modal-overlay" onClick={() => setAdminEditUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>EDIT USER</h2>
            <div className="form-group">
              <label>EMAIL</label>
              <input type="email" value={adminEditUser.email} disabled />
            </div>
            <div className="form-group">
              <label>USERNAME</label>
              <input type="text" value={adminEditData.username} onChange={(e) => setAdminEditData({...adminEditData, username: e.target.value})} />
            </div>
            <div className="form-group">
              <label>PROFILE PICTURE</label>
              <input type="file" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setAdminEditData({...adminEditData, avatar: ev.target.result});
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
            <button className="save-btn" onClick={async () => {
              try {
                const res = await fetch(`${BACKEND_URL}/users/profile`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    targetEmail: adminEditUser.email,
                    username: adminEditData.username,
                    avatar: adminEditData.avatar
                  })
                });
                const data = await res.json();
                if (data.ok) {
                  alert('User updated!');
                  setAdminEditUser(null);
                  fetchPendingUsers();
                } else {
                  alert('Update failed: ' + (data.error || 'Unknown error'));
                }
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }}>SAVE CHANGES</button>
            <button className="cancel-btn" onClick={() => setAdminEditUser(null)}>CANCEL</button>
          </div>
        </div>
      )}
      </>
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
    );
  }
export default App;
