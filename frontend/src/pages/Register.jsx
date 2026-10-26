import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', age: '', gender: 'other', contact: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} style={{ width: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #0ea5a0 0%, #06d6a0 100%)',
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(14,165,160,0.3)'
          }}>
            <span style={{ fontSize: 24 }}>👤</span>
          </div>
          <h1>Create Account</h1>
          <p className="muted">Register as a patient to get started</p>
        </div>
        {error && <div className="alert error">{error}</div>}

        <div className="field">
          <label>Full name</label>
          <input required placeholder="John Doe" value={form.name} onChange={update('name')} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Email address</label>
            <input type="email" required placeholder="you@example.com" value={form.email} onChange={update('email')} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} placeholder="Min 6 characters" value={form.password} onChange={update('password')} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Age</label>
            <input type="number" min="0" max="130" placeholder="25" value={form.age} onChange={update('age')} />
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={update('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Contact number</label>
          <input required placeholder="+91 98765 43210" value={form.contact} onChange={update('contact')} />
        </div>
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%', padding: '12px 20px', marginTop: 8 }}>
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
        <p className="switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
