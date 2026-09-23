import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send, Search } from 'lucide-react';
import SettingsModal from './SettingsModal';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [users, setUsers] = useState([]);
  const [userAvatar, setUserAvatar] = useState(null);
  
  // Screener State
  const [screenerSearch, setScreenerSearch] = useState('');
  const [screenerResults, setScreenerResults] = useState([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerCache, setScreenerCache] = useState({});
  const [peFilter, setPeFilter] = useState(50);
  const [priceFilter, setPriceFilter] = useState(0);
  const [orderModal, setOrderModal] = useState(false);
  const [orderData, setOrderData] = useState({ ticker: '', quantity: 0, direction: 'BUY', orderType: 'MARKET' });
  
  // Messages State
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [profileZoom, setProfileZoom] = useState({});
  
  // AI Chat State
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  
  // Admin State
  const [pendingUsers, setPendingUsers] = useState([]);
  const [adminAllUsers, setAdminAllUsers] = useState([]);
  const [adminEditUser, setAdminEditUser] = useState(null);
  const [adminEditData, setAdminEditData] = useState({ username: '', avatar: null });

  useEffect(() => {
    if (token) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setUserAvatar(data.user.avatar);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Fetch user error:', err);
      logout();
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setUsers(data.users);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/pending-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setPendingUsers(data.users);
      }
    } catch (err) {
      console.error('Fetch pending users error:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch(`${BACKEND_URL}/admin/pending-users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/admin/all-users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      
      if (pendingData.ok) setPendingUsers(pendingData.users);
      if (allData.ok) setAdminAllUsers(allData.users);
    } catch (err) {
      console.error('Fetch admin data error:', err);
    }
  };

  useEffect(() => {
    if (page === 'messages') {
      fetchUsers();
      const interval = setInterval(fetchUsers, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token]);

  useEffect(() => {
    if (page === 'admin' && user?.isAdmin) {
      fetchAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPage('login');
  };

  if (showSettings) {
    return (
      <SettingsModal 
        onClose={() => { setShowSettings(false); fetchUser(); }} 
        user={user} 
      />
    );
  }

  if (!token) {
    return <AuthPage onLogin={(token) => {
      setToken(token);
      localStorage.setItem('token', token);
      setPage('dashboard');
    }} />;
  }

  const Sidebar = () => (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-icon">⚙️</div>
        <h2>SCREENER</h2>
      </div>

      <nav className="nav-menu">
        <button 
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <LineChart size={18} /> DASHBOARD
        </button>
        <button 
          className={`nav-item ${page === 'screener' ? 'active' : ''}`}
          onClick={() => setPage('screener')}
        >
          <Search size={18} /> SCREENER
        </button>
        <button 
          className={`nav-item ${page === 'orders' ? 'active' : ''}`}
          onClick={() => setPage('orders')}
        >
          <BarChart3 size={18} /> ORDERS
        </button>
        <button 
          className={`nav-item ${page === 'messages' ? 'active' : ''}`}
          onClick={() => setPage('messages')}
        >
          <MessageSquare size={18} /> MESSAGES
        </button>
        <button 
          className={`nav-item ${page === 'ai' ? 'active' : ''}`}
          onClick={() => setPage('ai')}
        >
          <TrendingUp size={18} /> AI ASSISTANT
        </button>
        {user?.isAdmin && (
          <button 
            className={`nav-item ${page === 'admin' ? 'active' : ''}`}
            onClick={() => setPage('admin')}
          >
            ⚔️ ADMIN
          </button>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        <button className="logout-btn" onClick={logout}>
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

          <div className="dashboard-grid">
            <div className="stat-box">
              <p className="stat-label">TOTAL VALUE</p>
              <p className="stat-value" id="totalValue">$0.00</p>
              <p className="stat-detail">Real T212 Data</p>
            </div>
            <div className="stat-box">
              <p className="stat-label">CASH BALANCE</p>
              <p className="stat-value" id="cashBalance">$0.00</p>
              <p className="stat-detail">Available</p>
            </div>
            <div className="stat-box">
              <p className="stat-label">USED MARGIN</p>
              <p className="stat-value" id="usedMargin">$0.00</p>
              <p className="stat-detail">Invested</p>
            </div>
            <div className="stat-box">
              <p className="stat-label">HOLDINGS</p>
              <p className="stat-value" id="holdings">0 ASSETS</p>
              <p className="stat-detail">From T212</p>
            </div>
          </div>

          <button 
            className="connect-btn"
            onClick={() => setShowSettings(true)}
            style={{ marginTop: '20px', width: '200px' }}
          >
            {user?.t212Connected ? 'UPDATE CONNECTION' : 'CONNECT T212'}
          </button>

          <script dangerouslySetInnerHTML={{__html: `
            (async () => {
              const token = localStorage.getItem('token');
              if (!token) return;
              try {
                const res = await fetch('${BACKEND_URL}/portfolio/stats', {
                  headers: { Authorization: 'Bearer ' + token }
                });
                const data = await res.json();
                if (data.ok) {
                  document.getElementById('totalValue').textContent = '$' + (data.stats.totalValue || 0).toFixed(2);
                  document.getElementById('cashBalance').textContent = '$' + (data.stats.cashBalance || 0).toFixed(2);
                  document.getElementById('usedMargin').textContent = '$' + (data.stats.usedMargin || 0).toFixed(2);
                }
              } catch (err) {
                console.error('Stats error:', err);
              }
            })();
          `}} />
        </div>
      </div>
    );
  }

  if (page === 'screener') {
    const filteredResults = screenerResults.filter(stock => {
      const peOk = !stock.pe || stock.pe <= peFilter;
      const priceOk = !stock.price || stock.price >= priceFilter;
      return peOk && priceOk;
    });

    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>STOCK SCREENER</h2>
            <p className="subtitle">REAL-TIME MARKET ANALYSIS</p>
          </header>

          <div className="screener-controls">
            <div className="search-box">
              <label>SEARCH TICKER</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="e.g., NVDA"
                  value={screenerSearch}
                  onChange={(e) => setScreenerSearch(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && (() => {
                    if (!screenerSearch.trim()) return;
                    
                    const ticker = screenerSearch.toUpperCase();
                    
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
                        setScreenerCache(prev => ({ ...prev, [ticker]: stock }));
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
                  disabled={screenerLoading}
                  className="search-input"
                />
                <button 
                  className="search-btn"
                  onClick={() => {
                    if (!screenerSearch.trim()) return;
                    
                    const ticker = screenerSearch.toUpperCase();
                    
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
                        setScreenerCache(prev => ({ ...prev, [ticker]: stock }));
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
                >SEARCH</button>
              </div>
            </div>

            <label>P/E MAX: {peFilter}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={peFilter}
              onChange={(e) => setPeFilter(parseInt(e.target.value))}
              className="slider"
            />

            <label>PRICE MIN: ${priceFilter}</label>
            <input
              type="range"
              min="0"
              max="500"
              value={priceFilter}
              onChange={(e) => setPriceFilter(parseInt(e.target.value))}
              className="slider"
            />
          </div>

          {screenerResults.length > 0 && (
            <div className="screener-results">
              <table className="results-table">
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
                    <tr key={i} style={{ cursor: 'pointer' }}>
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
            <h2>MESSAGES</h2>
            <p className="subtitle">SECURE MESSAGING SYSTEM</p>
          </header>

          <div className="messages-container">
            <div className="users-list">
              <h3>USERS</h3>
              {users.filter(u => u.email !== user?.email).map(u => (
                <button
                  key={u.email}
                  className={`user-btn ${selectedUser?.email === u.email ? 'active' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <span className="avatar">{u.username?.[0] || 'U'}</span>
                  <span className="user-name">{u.username}</span>
                </button>
              ))}
            </div>

            {selectedUser ? (
              <div className="chat-view">
                <div className="chat-header">
                  <h3>{selectedUser.username}</h3>
                </div>
                <div className="chat-messages">
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
                </div>

                <div className="message-input-area">
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && messageInput.trim()) {
                        (async () => {
                          try {
                            await fetch(`${BACKEND_URL}/messages/send`, {
                              method: 'POST',
                              headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                toEmail: selectedUser.email,
                                text: messageInput,
                                messageType: 'text'
                              })
                            });
                            setMessageInput('');
                            const res = await fetch(`${BACKEND_URL}/messages/${selectedUser.email}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (data.ok) setMessages(data.messages);
                          } catch (err) {
                            alert('Error sending message: ' + err.message);
                          }
                        })();
                      }
                    }}
                    className="message-input"
                  />
                  <button 
                    onClick={() => {
                      if (!messageInput.trim()) return;
                      (async () => {
                        try {
                          await fetch(`${BACKEND_URL}/messages/send`, {
                            method: 'POST',
                            headers: { 
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              toEmail: selectedUser.email,
                              text: messageInput,
                              messageType: 'text'
                            })
                          });
                          setMessageInput('');
                          const res = await fetch(`${BACKEND_URL}/messages/${selectedUser.email}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.ok) setMessages(data.messages);
                        } catch (err) {
                          alert('Error sending message: ' + err.message);
                        }
                      })();
                    }}
                    className="send-btn"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-chat">
                <p>Select a user to start messaging</p>
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
              <div className="orders-container">
                <h3>ACTIVE ORDERS</h3>
                <div className="orders-list" id="ordersContainer">
                  <p className="empty-message">Loading orders...</p>
                </div>
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
                    <h3>👋 Welcome to AI Market Analyst</h3>
                    <p>Ask me about stocks, trading strategies, or portfolio analysis</p>
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
        setMessage('Account created! Awaiting admin approval.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
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

        {isSignup ? (
          <form onSubmit={handleSignup} className="login-form">
            <div className="form-group">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="user@example.com"
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
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="user@example.com"
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

            <button type="submit" className="login-btn">ACCESS SYSTEM</button>

            <p className="terminal">TERMINAL: 01 A COLD LINK</p>
            <p className="hint">
              New user? <button type="button" className="link-btn" onClick={() => setIsSignup(true)}>SIGN UP HERE</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
