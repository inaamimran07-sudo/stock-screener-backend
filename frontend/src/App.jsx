import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [stocks, setStocks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [username, setUsername] = useState('');

  const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Get stored token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const email = Buffer.from(token, 'base64').toString();
      setUser({ email, token });
      setCurrentPage('dashboard');
      fetchStocks();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setUser({ ...data.user, token: data.token });
        setCurrentPage('dashboard');
        fetchStocks();
      } else {
        alert('Login failed: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.ok) {
        alert(data.status);
        setFormData({ email: '', password: '' });
        setCurrentPage('login');
      } else {
        alert('Signup failed: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/stocks/screen?halal=true&minScore=75`);
      const data = await response.json();
      if (data.ok) {
        setStocks(data.stocks);
      }
    } catch (error) {
      console.error('Fetch stocks error:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
    }
  };

  const handleCreateOrder = async (type) => {
    const ticker = prompt('Enter ticker symbol:');
    if (!ticker) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          ticker,
          price: 100,
          quantity: 1
        })
      });
      const data = await response.json();
      if (data.ok) {
        alert('Order created: ' + data.order.id);
        fetchOrders();
      }
    } catch (error) {
      alert('Error creating order: ' + error.message);
    }
  };

  const handleAIChat = async (e) => {
    e.preventDefault();
    if (!chatInput) return;

    const userMessage = { role: 'user', content: chatInput };
    setMessages([...messages, userMessage]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: chatInput })
      });
      const data = await response.json();
      if (data.ok) {
        const aiMessage = { role: 'assistant', content: data.response };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
    }
    setChatInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('login');
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/pending-users`);
      const data = await response.json();
      if (data.ok) {
        setPendingUsers(data.pending);
      }
    } catch (error) {
      console.error('Fetch pending users error:', error);
    }
  };

  const approveUser = async (email) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/auth/approve-user/${email}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok) {
        alert('User approved');
        fetchPendingUsers();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/users/upload-avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: event.target.result })
        });
        const data = await response.json();
        if (data.ok) {
          alert('Avatar uploaded!');
        }
      } catch (error) {
        alert('Error uploading avatar: ' + error.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetUsername = async (e) => {
    e.preventDefault();
    if (!username) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/users/set-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (data.ok) {
        alert('Username set!');
        setUsername('');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="app">
      {!user ? (
        <div className="auth-container">
          <div className="auth-box">
            <h1>SCREENER</h1>
            <div className="auth-toggle">
              <button 
                onClick={() => setCurrentPage('login')}
                className={currentPage === 'login' ? 'active' : ''}
              >
                Login
              </button>
              <button 
                onClick={() => setCurrentPage('signup')}
                className={currentPage === 'signup' ? 'active' : ''}
              >
                Sign Up
              </button>
            </div>

            {currentPage === 'login' ? (
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="submit">Login</button>
                <p style={{color: '#888', fontSize: '12px', marginTop: '1rem'}}>
                  Demo: test@example.com / test123
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="submit">Sign Up</button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <header className="navbar">
            <h1>SCREENER</h1>
            <div className="nav-buttons">
              <button onClick={() => { setCurrentPage('dashboard'); }}>Dashboard</button>
              <button onClick={() => { setCurrentPage('screener'); fetchStocks(); }}>Stocks</button>
              <button onClick={() => { setCurrentPage('orders'); fetchOrders(); }}>Orders</button>
              <button onClick={() => setCurrentPage('ai')}>Messages</button>
              <button onClick={() => { setCurrentPage('admin'); fetchPendingUsers(); }}>Admin</button>
              <button onClick={() => setCurrentPage('profile')}>Profile</button>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          </header>

          <div className="page-container">
            {currentPage === 'dashboard' && (
              <div className="page">
                <h2>Dashboard</h2>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Portfolio Value</div>
                    <div className="metric-value">£45,230</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Today's Change</div>
                    <div className="metric-value positive">+£1,230</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Halal Holdings</div>
                    <div className="metric-value">12/15</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Avg Score</div>
                    <div className="metric-value">87</div>
                  </div>
                </div>
              </div>
            )}

            {currentPage === 'screener' && (
              <div className="page">
                <h2>Stock Screener</h2>
                <table className="stocks-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Change</th>
                      <th>P/E</th>
                      <th>ROE</th>
                      <th>YoY Growth</th>
                      <th>Halal</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock, i) => (
                      <tr key={i}>
                        <td className="ticker">{stock.ticker}</td>
                        <td>${stock.price.toFixed(2)}</td>
                        <td className={stock.change >= 0 ? 'positive' : 'negative'}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                        </td>
                        <td>{stock.pe}</td>
                        <td>{stock.roe.toFixed(1)}%</td>
                        <td className={stock.yoyGrowth >= 0 ? 'positive' : 'negative'}>
                          {stock.yoyGrowth >= 0 ? '+' : ''}{stock.yoyGrowth}%
                        </td>
                        <td>{stock.halal ? '✓ Halal' : '✗ No'}</td>
                        <td><span className="score-badge">{stock.score}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {currentPage === 'orders' && (
              <div className="page">
                <h2>Orders</h2>
                <div style={{marginBottom: '1rem'}}>
                  <button onClick={() => handleCreateOrder('BUY')} style={{marginRight: '0.5rem'}}>Buy</button>
                  <button onClick={() => handleCreateOrder('SELL')}>Sell</button>
                </div>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.type}</td>
                        <td>{order.ticker}</td>
                        <td>${order.price}</td>
                        <td>{order.quantity}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {currentPage === 'ai' && (
              <div className="page">
                <h2>AI Assistant</h2>
                <div className="chat-container">
                  <div className="messages">
                    {messages.map((msg, i) => (
                      <div key={i} className={`message ${msg.role}`}>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAIChat}>
                    <input
                      type="text"
                      placeholder="Ask about stocks..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit">Send</button>
                  </form>
                </div>
              </div>
            )}

            {currentPage === 'admin' && (
              <div className="page">
                <h2>Admin Panel</h2>
                <div className="admin-section">
                  <h3>Pending Approvals</h3>
                  {pendingUsers.length === 0 ? (
                    <p>No pending users</p>
                  ) : (
                    pendingUsers.map((u) => (
                      <div key={u.email} className="user-item">
                        <span>{u.email}</span>
                        <button onClick={() => approveUser(u.email)}>Approve</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {currentPage === 'profile' && (
              <div className="page">
                <h2>Your Profile</h2>
                <div className="profile-card">
                  <div className="avatar-section">
                    <div className="avatar"></div>
                    <label className="upload-btn">
                      ⬆ Upload Photo
                      <input type="file" onChange={handleUploadAvatar} accept="image/*" />
                    </label>
                  </div>
                  <div className="profile-info">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Status:</strong> <span className="status-badge">✓ Active</span></p>
                  </div>
                  <form onSubmit={handleSetUsername} className="username-form">
                    <input
                      type="text"
                      placeholder="Set username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <button type="submit">Save Username</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
