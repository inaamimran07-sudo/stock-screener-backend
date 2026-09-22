import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, BarChart3, MessageSquare, Settings, LogOut, Send } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');

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

  if (!token) {
    return <LoginPage onLogin={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
  }

  const Sidebar = () => (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-icon">⚙️</div>
        <h1>SCREENER</h1>
      </div>
      
      <nav className="nav-items">
        <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
          <BarChart3 size={18} /> DASHBOARD
        </button>
        <button className={`nav-item ${page === 'screener' ? 'active' : ''}`} onClick={() => setPage('screener')}>
          <LineChart size={18} /> SCREENER
        </button>
        <button className={`nav-item ${page === 'orders' ? 'active' : ''}`} onClick={() => setPage('orders')}>
          <TrendingUp size={18} /> ORDERS
        </button>
        <button className={`nav-item ${page === 'ai' ? 'active' : ''}`} onClick={() => setPage('ai')}>
          <MessageSquare size={18} /> AI ASSISTANT
        </button>
      </nav>

      <div className="user-section">
        <div className="user-profile">
          <div className="avatar">👤</div>
          <div className="user-info">
            <p className="username">{user?.username || 'OPERATOR_99'}</p>
            <p className="level">LEVEL 4</p>
          </div>
        </div>
        <button className="logout-btn" onClick={() => { setToken(null); localStorage.removeItem('token'); }}>
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
            <p className="subtitle">STABLE ORBITAL LINK // QUANTUM TICKER ACTIVE</p>
          </header>
          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">TOTAL VALUE</p>
              <h3>$1,284,592</h3>
              <p className="stat-detail">+$12.5K DELTA</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">TODAY'S GAIN</p>
              <h3 className="positive">+$12,847</h3>
              <p className="stat-detail">+1.01% INDEX</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">ROI METRIC</p>
              <h3 className="highlight">24.7%</h3>
              <p className="stat-detail">ANNUAL RATE</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">HOLDINGS</p>
              <h3>18 ASSETS</h3>
              <p className="stat-detail">6 CRYPTO // 12 STOCKS</p>
            </div>
          </div>

          <div className="portfolio-section">
            <div className="holdings-container">
              <h3>ACTIVE POSITIONS</h3>
              <table className="holdings-table">
                <thead>
                  <tr>
                    <th>TICKER</th>
                    <th>QTY</th>
                    <th>ENTRY</th>
                    <th>CURRENT</th>
                    <th>GAIN/LOSS</th>
                    <th>% CHANGE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticker: 'AAPL', qty: 140, entry: 172.50, current: 189.84, gain: 2427.60, change: 2.25 },
                    { ticker: 'NVDA', qty: 205, entry: 420.00, current: 875.12, gain: 93300, change: 108.3 },
                    { ticker: 'MSFT', qty: 90, entry: 350.10, current: 415.50, gain: 5886, change: 18.68 },
                  ].map((h, i) => (
                    <tr key={i}>
                      <td className="ticker">{h.ticker}</td>
                      <td>{h.qty}</td>
                      <td>${h.entry}</td>
                      <td>${h.current}</td>
                      <td className={h.gain > 0 ? 'gain' : 'loss'}>${h.gain}</td>
                      <td className={h.change > 0 ? 'gain-text' : 'loss-text'}>{h.change > 0 ? '+' : ''}{h.change}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
            <p className="subtitle">FILTER DEEP TECH MATRIX</p>
          </header>
          <p style={{color: '#888', textAlign: 'center'}}>Stock screening interface</p>
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
            <h2>ORDERS</h2>
            <p className="subtitle">EXECUTE TRANSACTIONS</p>
          </header>
          <p style={{color: '#888', textAlign: 'center'}}>Order management interface</p>
        </div>
      </div>
    );
  }

  if (page === 'ai') {
    const handleAiChat = async () => {
      if (!aiInput.trim()) return;
      setAiChat([...aiChat, { role: 'user', text: aiInput }]);
      setAiInput('');
      try {
        const res = await fetch(`${BACKEND_URL}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: aiInput })
        });
        const data = await res.json();
        setAiChat(prev => [...prev, { role: 'assistant', text: data.response || 'Service unavailable' }]);
      } catch (err) {
        setAiChat(prev => [...prev, { role: 'assistant', text: 'Error connecting' }]);
      }
    };

    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <header className="header">
            <h2>AI ASSISTANT</h2>
            <p className="subtitle">MARKET ANALYST</p>
          </header>
          <div className="ai-chat-container">
            <div className="chat-messages">
              {aiChat.length === 0 ? (
                <div className="welcome-message">
                  <h3>AI Assistant Ready</h3>
                  <p>Ask about stocks, portfolio, or markets</p>
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
              <input type="text" placeholder="Ask..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAiChat()} className="ai-input" />
              <button onClick={handleAiChat} className="send-btn"><Send size={18} /></button>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        <div className="security-protocol">SECURITY PROTOCOL: v3.45.9</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input type="email" placeholder="operator@screener.tech" value={email} onChange={(e) => setEmail(e.target.value)} />
            <span className="sys-ok">SYS_OK</span>
          </div>
          <div className="form-group">
            <label>PASSPHRASE</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="sys-ok">SYS_OK</span>
          </div>
          <button type="submit" className="login-btn">INITIATE SESSION</button>
          <p className="terminal">TERMINAL: 01 A COLD LINK</p>
        </form>
      </div>
    </div>
  );
}

export default App;
