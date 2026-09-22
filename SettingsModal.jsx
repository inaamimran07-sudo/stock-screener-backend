import React, { useState } from 'react';
import { X, Link2, Unlink2 } from 'lucide-react';
import './SettingsModal.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function SettingsModal({ onClose, user }) {
  const [name, setName] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [t212Key, setT212Key] = useState('');
  const [t212Connected, setT212Connected] = useState(user?.t212Connected || false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: name, avatar })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('✅ Profile updated successfully');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error updating profile');
    }
    setLoading(false);
  };

  const handleConnectT212 = async () => {
    if (!t212Key.trim()) {
      setMessage('❌ Enter API key');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/users/connect-t212`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ apiKey: t212Key })
      });
      const data = await res.json();
      if (data.ok) {
        setT212Connected(true);
        setT212Key('');
        setMessage('✅ Trading212 connected successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Connection failed - check API key');
    }
    setLoading(false);
  };

  const handleDisconnectT212 = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/users/disconnect-t212`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.ok) {
        setT212Connected(false);
        setMessage('✅ Trading212 disconnected');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (err) {
      setMessage('❌ Disconnection failed');
    }
    setLoading(false);
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>SETTINGS</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>}

        {/* Profile Section */}
        <div className="settings-section">
          <h3>👤 PROFILE</h3>
          <div className="avatar-upload">
            {avatar ? (
              <img src={avatar} alt="avatar" className="preview" />
            ) : (
              <div className="preview empty">👤</div>
            )}
            <label className="file-input-label">
              UPLOAD AVATAR
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
            className="input"
          />
          <button 
            onClick={handleSaveProfile} 
            disabled={loading} 
            className="btn primary"
          >
            SAVE PROFILE
          </button>
        </div>

        {/* Trading212 Section */}
        <div className="settings-section">
          <h3>📊 TRADING212</h3>
          {!t212Connected ? (
            <>
              <input
                type="password"
                value={t212Key}
                onChange={(e) => setT212Key(e.target.value)}
                placeholder="Paste your T212 API key"
                className="input"
              />
              <button 
                onClick={handleConnectT212} 
                disabled={loading} 
                className="btn success"
              >
                <Link2 size={16} /> CONNECT
              </button>
              <p className="hint">
                🔗 Get API key from Trading212 → Settings → API tokens
              </p>
            </>
          ) : (
            <>
              <p className="status">✅ Connected to Trading212</p>
              <button 
                onClick={handleDisconnectT212} 
                disabled={loading} 
                className="btn danger"
              >
                <Unlink2 size={16} /> DISCONNECT
              </button>
            </>
          )}
        </div>

        <button className="btn logout" onClick={onClose}>CLOSE SETTINGS</button>
      </div>
    </div>
  );
}

export default SettingsModal;
