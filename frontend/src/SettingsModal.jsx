import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import './SettingsModal.css';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function SettingsModal({ onClose, user }) {
  const [username, setUsername] = useState(user?.username || 'OPERATOR');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [t212Key, setT212Key] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username || 'OPERATOR',
          avatar,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage('✅ Profile saved successfully!');
      } else {
        setError(data.error || 'Failed to save profile');
      }
    } catch (err) {
      setError('Error saving profile: ' + err.message);
    }

    setLoading(false);
  };

  const handleConnectT212 = async () => {
    if (!t212Key.trim()) {
      setError('T212 API key cannot be empty');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/users/connect-t212`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          t212ApiKey: t212Key.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage('✅ Trading212 connected successfully!');
        setT212Key('');
      } else {
        setError(data.error || 'Failed to connect T212');
      }
    } catch (err) {
      setError('Error connecting T212: ' + err.message);
    }

    setLoading(false);
  };

  const handleDisconnectT212 = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/users/disconnect-t212`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        setMessage('✅ Trading212 disconnected');
        setT212Key('');
      } else {
        setError(data.error || 'Failed to disconnect');
      }
    } catch (err) {
      setError('Error disconnecting: ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ SETTINGS</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="settings-section">
          <h3>PROFILE</h3>

          <div className="avatar-section">
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '4px' }} />
              ) : (
                '👤'
              )}
            </div>
            <label className="upload-btn">
              <Upload size={18} />
              UPLOAD AVATAR
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-group">
            <label>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="OPERATOR"
            />
          </div>

          <button className="action-btn" onClick={handleSaveProfile} disabled={loading}>
            {loading ? 'SAVING...' : 'SAVE PROFILE'}
          </button>
        </div>

        <div className="settings-section">
          <h3>TRADING212 CONNECTION</h3>

          {user?.t212Connected ? (
            <div className="connected-status">
              <p className="status-text">🟢 CONNECTED</p>
              <button className="action-btn disconnect" onClick={handleDisconnectT212} disabled={loading}>
                DISCONNECT
              </button>
            </div>
          ) : (
            <div className="form-group">
              <label>API KEY</label>
              <input
                type="password"
                value={t212Key}
                onChange={(e) => setT212Key(e.target.value)}
                placeholder="Paste your T212 API key here"
              />
              <p className="hint">Your API key will be securely stored</p>
              <button className="action-btn" onClick={handleConnectT212} disabled={loading || !t212Key.trim()}>
                {loading ? 'CONNECTING...' : 'CONNECT T212'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
