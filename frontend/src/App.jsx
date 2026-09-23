import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ============================================================================
// ENHANCED APP WITH DRAG-AND-DROP DASHBOARD & IMPROVED UI
// ============================================================================

const PortfolioDashboard = ({ token, user, setPage }) => {
  const [stats, setStats] = useState({
    totalValue: 0,
    cashBalance: 0,
    usedMargin: 0,
    investedHoldings: 0,
    assets: 0
  });
  const [widgets] = useState(['portfolio', 'screener', 'orders']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/portfolio/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setStats({
          totalValue: data.totalValue || 0,
          cashBalance: data.cashBalance || 0,
          usedMargin: data.usedMargin || 0,
          investedHoldings: data.investedHoldings || 0,
          assets: data.assets || 0
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const renderWidget = (widget) => {
    switch (widget) {
      case 'portfolio':
        return (
          <div
            key="portfolio"
            className="glitch-card"
          >
            <div className="widget-header">
              <span>📊 PORTFOLIO OVERVIEW</span>
            </div>
            <div className="portfolio-grid">
              <div className="stat-box">
                <div className="stat-label">Total Value</div>
                <div className="stat-value cyan-text">${stats.totalValue.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Cash Balance</div>
                <div className="stat-value lime-text">${stats.cashBalance.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Used Margin</div>
                <div className="stat-value amber-text">${stats.usedMargin.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Invested</div>
                <div className="stat-value magenta-text">${stats.investedHoldings.toFixed(2)}</div>
              </div>
            </div>
            <button 
              onClick={() => setPage('screener')}
              className="btn-primary"
            >
              Launch Screener →
            </button>
          </div>
        );
      case 'screener':
        return <ScreenerWidget key="screener" token={token} dashboard />;
      case 'orders':
        return <OrdersWidget key="orders" token={token} dashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="cyber-title">PORTFOLIO COMMAND CENTER</h1>
        <p className="subtitle">Real-time market intelligence & execution</p>
        <div className="divider"></div>
      </div>
      
      <div className="widgets-grid">
        {widgets.map(widget => renderWidget(widget))}
      </div>
    </div>
  );
};

const ScreenerWidget = ({ token, dashboard }) => {
  const [ticker, setTicker] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    peMax: 50,
    priceMin: 0
  });
  const [selectedStock, setSelectedStock] = useState(null);

  const handleSearch = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/screener/search?q=${ticker}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data.stocks || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glitch-card screener-card">
      <div className="widget-header">
        <span>🔍 STOCK SCREENER</span>
      </div>
      
      <div className="screener-controls">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter ticker (e.g., NVDA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="cyber-input"
          />
          <button onClick={handleSearch} className="btn-search">SCAN</button>
        </div>

        <div className="filter-row">
          <label>P/E Max: {filters.peMax}</label>
          <input
            type="range"
            min="10"
            max="100"
            value={filters.peMax}
            onChange={(e) => setFilters({...filters, peMax: parseInt(e.target.value)})}
            className="slider"
          />
        </div>
      </div>

      <div className="results-container">
        {loading && <div className="loader">SCANNING...</div>}
        {results.length === 0 && !loading && <div className="empty-state">No results found</div>}
        
        {results.map((stock) => (
          <div key={stock.ticker} className="stock-result-card">
            <div className="stock-header">
              <span className="ticker-badge">{stock.ticker}</span>
              <span className={`price ${stock.change >= 0 ? 'green' : 'red'}`}>
                ${stock.price} {stock.change >= 0 ? '▲' : '▼'}
              </span>
            </div>
            <div className="stock-metrics">
              <span>P/E: {stock.pe}</span>
              <span>ROE: {stock.roe}%</span>
              <span>Div: {stock.dividend}%</span>
            </div>
            <button 
              onClick={() => setSelectedStock(stock)}
              className="btn-secondary"
            >
              BUY / SELL
            </button>
          </div>
        ))}
      </div>

      {selectedStock && (
        <OrderModal stock={selectedStock} token={token} onClose={() => setSelectedStock(null)} />
      )}
    </div>
  );
};

const OrderModal = ({ stock, token, onClose }) => {
  const [orderType, setOrderType] = useState('BUY'); // BUY or SELL
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(stock.price);
  const [orderMode, setOrderMode] = useState('MARKET'); // MARKET or LIMIT
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalCost = (quantity * price).toFixed(2);

  const handlePlaceOrder = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/orders/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          quantity,
          price: orderMode === 'MARKET' ? stock.price : price,
          side: orderType.toLowerCase(),
          type: orderMode.toLowerCase()
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`✓ ${orderType} order for ${quantity} shares of ${stock.ticker} placed!`);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || 'Order failed');
      }
    } catch (err) {
      setError('Error placing order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>PLACE ORDER - {stock.ticker}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="order-form">
          {/* Order Type Selector */}
          <div className="form-group">
            <label>ORDER TYPE</label>
            <div className="button-group">
              <button
                onClick={() => setOrderType('BUY')}
                className={`btn-toggle ${orderType === 'BUY' ? 'active green' : 'inactive'}`}
              >
                🛒 BUY
              </button>
              <button
                onClick={() => setOrderType('SELL')}
                className={`btn-toggle ${orderType === 'SELL' ? 'active red' : 'inactive'}`}
              >
                📊 SELL
              </button>
            </div>
          </div>

          {/* Order Mode Selector */}
          <div className="form-group">
            <label>ORDER MODE</label>
            <div className="button-group">
              <button
                onClick={() => setOrderMode('MARKET')}
                className={`btn-toggle ${orderMode === 'MARKET' ? 'active cyan' : 'inactive'}`}
              >
                ⚡ MARKET
              </button>
              <button
                onClick={() => setOrderMode('LIMIT')}
                className={`btn-toggle ${orderMode === 'LIMIT' ? 'active cyan' : 'inactive'}`}
              >
                📍 LIMIT
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="form-group">
            <label>QUANTITY</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="cyber-input"
            />
          </div>

          {/* Price Input (only for LIMIT orders) */}
          {orderMode === 'LIMIT' && (
            <div className="form-group">
              <label>LIMIT PRICE</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="cyber-input"
              />
            </div>
          )}

          {/* Summary */}
          <div className="order-summary">
            <div className="summary-row">
              <span>Current Price:</span>
              <span className="value">${stock.price.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Quantity:</span>
              <span className="value">{quantity} shares</span>
            </div>
            {orderMode === 'LIMIT' && (
              <div className="summary-row">
                <span>Limit Price:</span>
                <span className="value">${price.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Cost:</span>
              <span className={`value ${orderType === 'BUY' ? 'red' : 'green'}`}>
                ${totalCost}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-group full-width">
            <button 
              onClick={handlePlaceOrder}
              disabled={loading}
              className={`btn-primary full ${loading ? 'disabled' : ''}`}
            >
              {loading ? 'EXECUTING...' : `CONFIRM ${orderType}`}
            </button>
            <button 
              onClick={onClose}
              className="btn-secondary full"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrdersWidget = ({ token, dashboard }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  return (
    <div className="glitch-card orders-card">
      <div className="widget-header">
        <span>📋 ACTIVE ORDERS</span>
      </div>

      {loading && <div className="loader">LOADING...</div>}
      {orders.length === 0 && !loading && <div className="empty-state">No active orders</div>}

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-item">
            <div className="order-info">
              <span className="ticker">{order.ticker}</span>
              <span className={`side ${order.side.toLowerCase()}`}>{order.side}</span>
              <span className="quantity">{order.quantity} shares @ ${order.price}</span>
            </div>
            <div className="order-status">
              <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// OTHER PAGES (SCREENER, MESSAGES, etc.)
// ============================================================================

const StockScreener = ({ token, setPage }) => {
  const [ticker, setTicker] = useState('');
  const [results, setResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/screener/search?q=${ticker}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data.stocks || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="cyber-title">STOCK SCREENER</h1>
        <p className="subtitle">Real-time market analysis engine</p>
        <div className="divider"></div>
      </div>

      <div className="content-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter ticker symbol (e.g., NVDA, TSLA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="cyber-input large"
          />
          <button onClick={handleSearch} className="btn-primary">SCAN</button>
        </div>

        {loading && <div className="loader">ANALYZING MARKETS...</div>}
        
        <div className="results-grid">
          {results.map((stock) => (
            <div key={stock.ticker} className="stock-card">
              <div className="stock-ticker">{stock.ticker}</div>
              <div className={`stock-price ${stock.change >= 0 ? 'green' : 'red'}`}>
                ${stock.price} {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
              </div>
              <div className="stock-metrics">
                <div>P/E Ratio: {stock.pe}</div>
                <div>ROE: {stock.roe}%</div>
                <div>Dividend: {stock.dividend}%</div>
                <div>Growth: {stock.growth}%</div>
              </div>
              <button 
                onClick={() => setSelectedStock(stock)}
                className="btn-secondary"
              >
                PLACE ORDER
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedStock && (
        <OrderModal stock={selectedStock} token={token} onClose={() => setSelectedStock(null)} />
      )}
    </div>
  );
};

const MessagesPage = ({ token, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
          text: newMessage
        })
      });
      if (res.ok) {
        setNewMessage('');
        // Refresh messages
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="cyber-title">SECURE MESSAGING</h1>
        <p className="subtitle">Encrypted communication system</p>
        <div className="divider"></div>
      </div>

      <div className="messaging-layout">
        <div className="users-sidebar">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
            >
              <img src={u.avatar} alt={u.username} className="user-avatar" />
              <span>{u.username}</span>
            </div>
          ))}
        </div>

        <div className="messages-container">
          {selectedUser ? (
            <>
              <div className="messages-header">
                <h2>{selectedUser.username}</h2>
              </div>
              <div className="messages-list" ref={messagesEndRef}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                    <img src={msg.sender.avatar} alt={msg.sender.username} className="msg-avatar" />
                    <div className="msg-content">
                      <div className="msg-text">{msg.text}</div>
                      <div className="msg-time">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="cyber-input"
                />
                <button onClick={handleSendMessage} className="btn-primary">SEND</button>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a user to message</div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ token, user, setUser }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState(['portfolio', 'screener', 'orders']);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/pending-users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setPendingUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching pending users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingUsers();
  }, [token]);

  const handleApprove = async (userId) => {
    try {
      await fetch(`${API_URL}/admin/approve-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleDeny = async (userId) => {
    try {
      await fetch(`${API_URL}/admin/deny-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error denying user:', err);
    }
  };

  const handleDragStart = (e, widget) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetWidget) => {
    e.preventDefault();
    if (draggedWidget === targetWidget) return;
    
    const draggedIdx = widgets.indexOf(draggedWidget);
    const targetIdx = widgets.indexOf(targetWidget);
    const newWidgets = [...widgets];
    [newWidgets[draggedIdx], newWidgets[targetIdx]] = [newWidgets[targetIdx], newWidgets[draggedIdx]];
    
    setWidgets(newWidgets);
    setDraggedWidget(null);
  };

  const allAvailableWidgets = [
    { id: 'portfolio', name: '📊 Portfolio Overview', desc: 'Show portfolio stats' },
    { id: 'screener', name: '🔍 Stock Screener', desc: 'Search & filter stocks' },
    { id: 'orders', name: '📋 Active Orders', desc: 'Display active orders' }
  ];

  const getWidgetName = (id) => allAvailableWidgets.find(w => w.id === id)?.name || id;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="cyber-title">ADMIN CONTROL PANEL</h1>
        <p className="subtitle">System configuration and user management</p>
        <div className="divider"></div>
      </div>

      <div className="admin-tabs-nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          ⚙️ Dashboard Config
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
        >
          👥 User Management
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="admin-section">
          <div className="config-card">
            <h2>Dashboard Widget Order</h2>
            <p className="subtitle" style={{marginBottom: '20px'}}>Drag to reorder widgets for all users</p>
            
            <div className="widgets-config-list">
              {widgets.map((widget) => (
                <div
                  key={widget}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, widget)}
                  className="widget-config-item"
                >
                  <span className="drag-icon">⋮⋮</span>
                  <span className="widget-name">{getWidgetName(widget)}</span>
                  <span className="widget-order">#{widgets.indexOf(widget) + 1}</span>
                </div>
              ))}
            </div>

            <div className="info-box">
              <p>ℹ️ Widget order will be applied to the Dashboard for all users on next login.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="admin-grid">
            {loading ? (
              <div className="loader">LOADING PENDING USERS...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="empty-state">No pending users to approve</div>
            ) : (
              pendingUsers.map((u) => (
                <div key={u.id} className="admin-user-card">
                  <div className="user-info">
                    <div className="username">{u.username}</div>
                    <div className="email">{u.email}</div>
                  </div>
                  <div className="admin-actions">
                    <button
                      onClick={() => handleApprove(u.id)}
                      className="btn-approve"
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      onClick={() => handleDeny(u.id)}
                      className="btn-deny"
                    >
                      ✕ DENY
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AIAssistant = ({ token, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = { role: 'user', text: input };
    setMessages([...messages, userMsg]);
    setInput('');

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="cyber-title">AI MARKET ANALYST</h1>
        <p className="subtitle">Claude 3.5 powered trading intelligence</p>
        <div className="divider"></div>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Ask about stocks, strategies, market trends..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            className="cyber-input"
          />
          <button onClick={handleAsk} disabled={loading} className="btn-primary">
            {loading ? 'THINKING...' : 'ANALYZE'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthPage = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/login' : '/register';
      const body = mode === 'login'
        ? { email, password }
        : { username, email, password };

      const res = await fetch(`${API_URL}/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.token) {
        onLogin(data.token);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>⚡ STOCK SCREENER</h1>
          <p>Powered by Claude AI</p>
        </div>

        <div className="auth-tabs">
          <button
            onClick={() => setMode('login')}
            className={`tab ${mode === 'login' ? 'active' : ''}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setMode('register')}
            className={`tab ${mode === 'register' ? 'active' : ''}`}
          >
            REGISTER
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="auth-form">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="cyber-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cyber-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            className="cyber-input"
          />
          <button
            onClick={handleAuth}
            disabled={loading}
            className="btn-primary full"
          >
            {loading ? 'PROCESSING...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    if (token) {
      const fetchUser = async () => {
        try {
          const res = await fetch(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          setUser(data.user);
          setPage('dashboard');
        } catch (err) {
          console.error('Error fetching user:', err);
          setToken('');
          localStorage.removeItem('token');
        }
      };
      fetchUser();
    }
  }, [token]);

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setPage('login');
    localStorage.removeItem('token');
  };

  if (!token) {
    return <AuthPage onLogin={(t) => {
      setToken(t);
      localStorage.setItem('token', t);
    }} />;
  }

  return (
    <div className="app-wrapper">
      <style>{`
        /* ========== GLOBAL STYLES ========== */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          background: #0a0e27;
          color: #00ffcc;
          overflow-x: hidden;
        }

        .app-wrapper {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
        }

        /* ========== SIDEBAR NAVIGATION ========== */
        .sidebar {
          width: 300px;
          background: rgba(10, 14, 39, 0.95);
          border-right: 2px solid #00ffcc;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: -5px 0 20px rgba(0, 255, 204, 0.1);
        }

        .app-logo {
          font-size: 28px;
          font-weight: bold;
          color: #00ffcc;
          text-shadow: 0 0 10px #00ffcc;
          margin-bottom: 20px;
          text-align: center;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .nav-item {
          padding: 12px 15px;
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #00ffcc;
          border-radius: 5px;
          color: #00ffcc;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
          font-weight: bold;
        }

        .nav-item:hover {
          background: rgba(0, 255, 204, 0.15);
          text-shadow: 0 0 10px #00ffcc;
          transform: translateX(5px);
        }

        .nav-item.active {
          background: #00ffcc;
          color: #0a0e27;
          box-shadow: 0 0 15px #00ffcc;
        }

        .user-profile {
          border-top: 2px solid #00ffcc;
          padding-top: 15px;
          text-align: center;
        }

        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid #00ffcc;
          margin-bottom: 10px;
        }

        .logout-btn {
          background: #ff0055;
          color: white;
          border: 2px solid #ff0055;
          padding: 8px 12px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .logout-btn:hover {
          background: transparent;
          color: #ff0055;
        }

        /* ========== MAIN CONTENT ========== */
        .main-content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
          background: linear-gradient(to bottom, rgba(0, 255, 204, 0.02), rgba(138, 43, 226, 0.02));
        }

        /* ========== PAGE HEADER ========== */
        .page-header {
          margin-bottom: 30px;
        }

        .cyber-title {
          font-size: 36px;
          color: #00ffcc;
          text-shadow: 0 0 20px #00ffcc;
          margin-bottom: 5px;
          letter-spacing: 2px;
        }

        .subtitle {
          font-size: 14px;
          color: #8a5fff;
          margin-bottom: 15px;
        }

        .divider {
          height: 2px;
          background: linear-gradient(90deg, #00ffcc, transparent);
          margin: 15px 0;
        }

        /* ========== CARDS & CONTAINERS ========== */
        .glitch-card {
          background: rgba(26, 26, 62, 0.8);
          border: 2px solid #00ffcc;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.2);
          transition: all 0.3s;
          cursor: grab;
        }

        .glitch-card:hover {
          box-shadow: 0 0 30px rgba(0, 255, 204, 0.4);
          transform: translateY(-2px);
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          font-size: 16px;
          font-weight: bold;
          color: #00ffcc;
          border-bottom: 1px solid rgba(0, 255, 204, 0.3);
          padding-bottom: 10px;
        }

        .drag-handle {
          cursor: grab;
          opacity: 0.6;
          font-size: 20px;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        /* ========== BUTTONS ========== */
        .btn-primary {
          background: linear-gradient(135deg, #00ffcc, #0088ff);
          color: #0a0e27;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
          box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
        }

        .btn-primary:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.8);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          color: #00ffcc;
          border: 2px solid #00ffcc;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          background: rgba(0, 255, 204, 0.1);
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
        }

        .btn-search {
          background: #00ffcc;
          color: #0a0e27;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .btn-search:hover {
          transform: scale(1.05);
          box-shadow: 0 0 15px #00ffcc;
        }

        .btn-toggle {
          flex: 1;
          padding: 10px;
          border: 2px solid #00ffcc;
          background: transparent;
          color: #00ffcc;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: bold;
        }

        .btn-toggle.active {
          background: #00ffcc;
          color: #0a0e27;
          box-shadow: 0 0 15px #00ffcc;
        }

        .btn-toggle.active.green {
          background: #00ff00;
          color: #0a0e27;
          box-shadow: 0 0 15px #00ff00;
        }

        .btn-toggle.active.red {
          background: #ff0055;
          color: white;
          box-shadow: 0 0 15px #ff0055;
        }

        .btn-toggle.inactive {
          opacity: 0.5;
        }

        .btn-approve {
          background: #00ff00;
          color: #0a0e27;
          border: none;
          padding: 8px 12px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .btn-deny {
          background: #ff0055;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        /* ========== INPUTS ========== */
        .cyber-input {
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #00ffcc;
          color: #00ffcc;
          padding: 10px 15px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          transition: all 0.3s;
        }

        .cyber-input:focus {
          outline: none;
          background: rgba(0, 255, 204, 0.1);
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
        }

        .cyber-input.large {
          font-size: 16px;
          padding: 15px;
        }

        /* ========== FORMS ========== */
        .order-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #8a5fff;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        .button-group.full-width {
          width: 100%;
        }

        .button-group.full-width .btn-primary,
        .button-group.full-width .btn-secondary {
          flex: 1;
        }

        /* ========== DASHBOARD ========== */
        .dashboard-container {
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          margin-bottom: 40px;
        }

        .widgets-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }

        .stat-box {
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #00ffcc;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-label {
          color: #8a5fff;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: bold;
        }

        .cyan-text { color: #00ffcc; }
        .lime-text { color: #00ff00; }
        .amber-text { color: #ffaa00; }
        .magenta-text { color: #ff00ff; }

        /* ========== STOCK RESULTS ========== */
        .results-container {
          max-height: 400px;
          overflow-y: auto;
          margin-top: 15px;
        }

        .stock-result-card {
          background: rgba(0, 255, 204, 0.05);
          border: 1px solid #00ffcc;
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 5px;
          transition: all 0.3s;
        }

        .stock-result-card:hover {
          background: rgba(0, 255, 204, 0.1);
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.3);
        }

        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .ticker-badge {
          background: #8a5fff;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
        }

        .price {
          font-size: 14px;
          font-weight: bold;
        }

        .price.green { color: #00ff00; }
        .price.red { color: #ff0055; }

        .stock-metrics {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #8a5fff;
          margin-bottom: 8px;
        }

        /* ========== MODAL ========== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: rgba(26, 26, 62, 0.95);
          border: 3px solid #00ffcc;
          border-radius: 10px;
          padding: 25px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 0 40px rgba(0, 255, 204, 0.5);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #00ffcc;
          padding-bottom: 15px;
        }

        .modal-header h2 {
          color: #00ffcc;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          color: #00ffcc;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .close-btn:hover {
          transform: rotate(90deg);
        }

        .order-summary {
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #8a5fff;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .summary-row.total {
          border-top: 1px solid #00ffcc;
          padding-top: 8px;
          margin-top: 8px;
          font-weight: bold;
          font-size: 16px;
        }

        .summary-row .value {
          color: #00ffcc;
          font-weight: bold;
        }

        /* ========== ORDERS LIST ========== */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 255, 204, 0.05);
          border: 1px solid #00ffcc;
          padding: 12px;
          border-radius: 5px;
        }

        .order-info {
          display: flex;
          gap: 15px;
          font-size: 13px;
        }

        .ticker {
          background: #8a5fff;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }

        .side {
          font-weight: bold;
        }

        .side.buy { color: #00ff00; }
        .side.sell { color: #ff0055; }

        .order-status {
          font-size: 12px;
        }

        .status {
          text-transform: uppercase;
          font-weight: bold;
        }

        .status.pending { color: #ffaa00; }
        .status.filled { color: #00ff00; }
        .status.cancelled { color: #ff0055; }

        /* ========== MESSAGES ========== */
        .messaging-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 20px;
          height: 600px;
        }

        .users-sidebar {
          background: rgba(26, 26, 62, 0.8);
          border: 2px solid #00ffcc;
          border-radius: 8px;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #00ffcc;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .user-item:hover {
          background: rgba(0, 255, 204, 0.1);
        }

        .user-item.active {
          background: #00ffcc;
          color: #0a0e27;
        }

        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid #00ffcc;
        }

        .messages-container {
          background: rgba(26, 26, 62, 0.8);
          border: 2px solid #00ffcc;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
        }

        .messages-header {
          padding: 15px;
          border-bottom: 2px solid #00ffcc;
          color: #00ffcc;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .message {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .message.sent {
          justify-content: flex-end;
        }

        .msg-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid #00ffcc;
        }

        .msg-content {
          max-width: 70%;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .msg-text {
          background: rgba(0, 255, 204, 0.1);
          border: 1px solid #00ffcc;
          padding: 10px 12px;
          border-radius: 5px;
          color: #00ffcc;
          word-break: break-word;
        }

        .message.sent .msg-text {
          background: rgba(0, 255, 204, 0.2);
          border: 1px solid #00ffcc;
        }

        .msg-time {
          font-size: 11px;
          color: #8a5fff;
        }

        .message-input {
          display: flex;
          gap: 10px;
          padding: 15px;
          border-top: 2px solid #00ffcc;
        }

        .message-input .cyber-input {
          flex: 1;
        }

        /* ========== AUTH PAGE ========== */
        .auth-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
        }

        .auth-container {
          background: rgba(26, 26, 62, 0.9);
          border: 3px solid #00ffcc;
          border-radius: 10px;
          padding: 40px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 0 40px rgba(0, 255, 204, 0.4);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .auth-header h1 {
          color: #00ffcc;
          font-size: 32px;
          text-shadow: 0 0 20px #00ffcc;
          margin-bottom: 10px;
        }

        .auth-header p {
          color: #8a5fff;
          font-size: 14px;
        }

        .auth-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: 2px solid #00ffcc;
          color: #00ffcc;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .tab.active {
          background: #00ffcc;
          color: #0a0e27;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .auth-form .cyber-input {
          width: 100%;
        }

        /* ========== UTILITIES ========== */
        .loader {
          text-align: center;
          padding: 20px;
          color: #00ffcc;
          font-size: 14px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .empty-state {
          text-align: center;
          padding: 30px;
          color: #8a5fff;
          font-size: 14px;
        }

        .error-box {
          background: rgba(255, 0, 85, 0.1);
          border: 2px solid #ff0055;
          color: #ff0055;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .success-box {
          background: rgba(0, 255, 0, 0.1);
          border: 2px solid #00ff00;
          color: #00ff00;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: rgba(0, 255, 204, 0.2);
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00ffcc;
          cursor: pointer;
          box-shadow: 0 0 10px #00ffcc;
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00ffcc;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px #00ffcc;
        }

        /* ========== ADMIN PANEL ========== */
        .admin-tabs-nav {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          border-bottom: 2px solid #00ffcc;
          padding-bottom: 10px;
        }

        .admin-tab {
          padding: 10px 20px;
          background: transparent;
          border: 2px solid #00ffcc;
          color: #00ffcc;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .admin-tab:hover {
          background: rgba(0, 255, 204, 0.1);
        }

        .admin-tab.active {
          background: #00ffcc;
          color: #0a0e27;
          box-shadow: 0 0 15px #00ffcc;
        }

        .admin-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .config-card {
          background: rgba(26, 26, 62, 0.8);
          border: 2px solid #00ffcc;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.2);
        }

        .config-card h2 {
          color: #00ffcc;
          margin-bottom: 8px;
          font-size: 18px;
        }

        .widgets-config-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
        }

        .widget-config-item {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(0, 255, 204, 0.05);
          border: 2px solid #00ffcc;
          padding: 15px 20px;
          border-radius: 8px;
          cursor: grab;
          transition: all 0.3s;
        }

        .widget-config-item:active {
          cursor: grabbing;
          background: rgba(0, 255, 204, 0.15);
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.4);
        }

        .widget-config-item:hover {
          background: rgba(0, 255, 204, 0.1);
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.3);
        }

        .drag-icon {
          color: #8a5fff;
          font-size: 16px;
          opacity: 0.7;
        }

        .widget-name {
          flex: 1;
          color: #00ffcc;
          font-weight: bold;
          font-size: 14px;
        }

        .widget-order {
          background: #8a5fff;
          color: #0a0e27;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
        }

        .info-box {
          background: rgba(138, 95, 255, 0.1);
          border: 2px solid #8a5fff;
          padding: 15px;
          border-radius: 8px;
          color: #8a5fff;
          font-size: 13px;
          line-height: 1.6;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .admin-user-card {
          background: rgba(26, 26, 62, 0.8);
          border: 2px solid #00ffcc;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.2);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .username {
          color: #00ffcc;
          font-weight: bold;
          font-size: 14px;
        }

        .email {
          color: #8a5fff;
          font-size: 12px;
        }

        .admin-actions {
          display: flex;
          gap: 10px;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 1024px) {
          .sidebar {
            width: 200px;
          }

          .messaging-layout {
            grid-template-columns: 150px 1fr;
          }
        }

        @media (max-width: 768px) {
          .app-wrapper {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 2px solid #00ffcc;
            flex-direction: row;
            padding: 10px;
            gap: 5px;
          }

          .app-logo {
            display: none;
          }

          .nav-menu {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .nav-item {
            flex: 1;
            min-width: 80px;
            font-size: 12px;
            padding: 8px;
          }

          .main-content {
            padding: 15px;
          }

          .cyber-title {
            font-size: 24px;
          }

          .messaging-layout {
            grid-template-columns: 1fr;
            height: auto;
          }

          .users-sidebar {
            flex-direction: row;
            flex-wrap: wrap;
            height: auto;
            max-height: 150px;
          }

          .portfolio-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="sidebar">
        <div className="app-logo">⚡ SCREENER</div>
        <div className="nav-menu">
          <button onClick={() => setPage('dashboard')} className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}>
            📊 Dashboard
          </button>
          <button onClick={() => setPage('screener')} className={`nav-item ${page === 'screener' ? 'active' : ''}`}>
            🔍 Screener
          </button>
          <button onClick={() => setPage('orders')} className={`nav-item ${page === 'orders' ? 'active' : ''}`}>
            📋 Orders
          </button>
          <button onClick={() => setPage('messages')} className={`nav-item ${page === 'messages' ? 'active' : ''}`}>
            💬 Messages
          </button>
          <button onClick={() => setPage('ai')} className={`nav-item ${page === 'ai' ? 'active' : ''}`}>
            🤖 AI Chat
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => setPage('admin')} className={`nav-item ${page === 'admin' ? 'active' : ''}`}>
              🔐 Admin
            </button>
          )}
        </div>
        <div className="user-profile">
          <img src={user?.avatar || 'https://via.placeholder.com/50'} alt="Profile" className="user-avatar" />
          <div style={{ color: '#00ffcc', marginBottom: '10px' }}>{user?.username}</div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="main-content">
        {page === 'dashboard' && <PortfolioDashboard token={token} user={user} setPage={setPage} />}
        {page === 'screener' && <StockScreener token={token} setPage={setPage} />}
        {page === 'orders' && <OrdersWidget token={token} />}
        {page === 'messages' && <MessagesPage token={token} user={user} />}
        {page === 'ai' && <AIAssistant token={token} user={user} />}
        {page === 'admin' && <AdminPanel token={token} user={user} setUser={setUser} />}
      </div>
    </div>
  );
}
