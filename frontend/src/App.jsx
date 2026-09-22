import React, { useState } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>SCREENER</h1>
            <p className="subtitle">STOCK SCREENING</p>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              const data = await res.json();
              if (data.ok && data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
              } else {
                alert(data.error);
              }
            } catch (err) {
              alert('Connection error');
            }
          }}>
            <div className="form-group">
              <label>EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="login-btn">LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1>SCREENER</h1>
        <button onClick={() => { localStorage.removeItem('token'); setToken(null); }}>LOGOUT</button>
      </div>
      <div className="main-content">
        <h2>Dashboard</h2>
        <p>Stock screener running</p>
      </div>
    </div>
  );
}

export default App;
