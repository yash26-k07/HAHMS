import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #0ea5a0 0%, #06d6a0 100%)',
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(14,165,160,0.3)'
          }}>
            <span style={{ fontSize: 24 }}>🏥</span>
          </div>
          <h1>Welcome Back</h1>
          <p className="muted">Sign in to Meridian Health</p>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label>Email address</label>
          <input type="email" required placeholder="you@example.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required placeholder="••••••••" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%', padding: '12px 20px', marginTop: 8 }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="switch">New patient? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
