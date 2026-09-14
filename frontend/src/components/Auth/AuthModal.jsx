import React, { useState } from 'react';
import {
  Shield,
  Key,
  Mail,
  User,
  LogIn,
  UserPlus,
  Compass,
  X,
  CheckCircle2,
  AlertCircle,
  Satellite,
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      mode === 'login'
        ? { email, password }
        : { email, password, username: username || email.split('@')[0] };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-backdrop" onClick={onClose} />
      <div className="auth-modal" role="dialog" aria-modal="true">
        <button
          className="auth-close-btn"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="auth-header">
          <div className="auth-brand">
            <div className="auth-icon-glow">
              <Satellite size={26} className="auth-sat-icon" />
            </div>
            <div>
              <h2 className="auth-title">SatQuery AI</h2>
              <span className="auth-subtitle">Geospatial Intelligence Gateway</span>
            </div>
          </div>
          <div className="auth-telemetry-strip">
            <span className="telemetry-pill">SECURE CONNECTION</span>
            <span className="telemetry-pill">PG-SQL PERSISTENCE</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-input-group">
              <label htmlFor="auth-username">Analyst Callsign / Name</label>
              <div className="auth-input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="auth-username"
                  type="text"
                  placeholder="e.g. Commander Moksh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={mode === 'register'}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-email">Official Email</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="analyst@geospatial.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password">Security Passcode</label>
            <div className="auth-input-wrapper">
              <Key size={16} className="input-icon" />
              <input
                id="auth-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : mode === 'login' ? (
              <>
                <LogIn size={16} /> Access Command Center
              </>
            ) : (
              <>
                <Shield size={16} /> Initialize Analyst Profile
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-note">
          <CheckCircle2 size={13} /> Sign in is required to use the command center and save your analysis history.
        </div>
      </div>
    </div>
  );
}
