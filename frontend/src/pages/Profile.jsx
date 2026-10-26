import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwNotice, setPwNotice] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((data) => {
      setProfile(data);
      if (data.profile) {
        setForm({
          name: data.profile.name || data.name || '',
          age: data.profile.age || '',
          gender: data.profile.gender || 'other',
          contact: data.profile.contact || data.phone || '',
          email: data.profile.email || data.email || '',
          address: data.profile.address || '',
          blood_group: data.profile.blood_group || '',
        });
      } else {
        setForm({ name: data.name, email: data.email, phone: data.phone || '' });
      }
    }).catch((e) => setError(e.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      if (user.role === 'patient' && profile?.profile?.patient_id) {
        await api.put(`/patients/${profile.profile.patient_id}`, form);
        setNotice('Profile updated successfully!');
        setEditing(false);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (!profile) return <Layout title="My Profile"><div className="empty-state">Loading profile…</div></Layout>;

  const p = profile.profile;

  return (
    <Layout title="My Profile">
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="grid grid-2">
        {/* Profile Card */}
        <div className="card profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{profile.name}</h2>
              <p className="muted" style={{ margin: 0 }}>{profile.email}</p>
              <span className="badge" style={{ marginTop: 8, display: 'inline-block', background: 'var(--teal-glow)', color: 'var(--teal-dark)' }}>
                {profile.role}
              </span>
            </div>
          </div>

          {p && !editing && (
            <div className="profile-details">
              <div className="profile-row">
                <span className="profile-label">📞 Phone</span>
                <span>{p.contact || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">🎂 Age</span>
                <span>{p.age || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">⚧ Gender</span>
                <span style={{ textTransform: 'capitalize' }}>{p.gender || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">🩸 Blood Group</span>
                <span>{p.blood_group || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">📍 Address</span>
                <span>{p.address || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">📧 Email</span>
                <span>{p.email || profile.email}</span>
              </div>
              {user.role === 'patient' && (
                <button className="btn" style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          )}

          {editing && (
            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-row">
                <div className="field"><label>Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label>Age</label>
                  <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="field"><label>Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
                <div className="field"><label>Blood Group</label>
                  <input placeholder="e.g. O+" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} /></div>
              </div>
              <div className="field"><label>Contact</label>
                <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="field"><label>Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" type="submit">Save Changes</button>
                <button className="btn secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* Account Info Card */}
        <div>
          <div className="card">
            <div className="section-title"><h3>🏥 Account Information</h3></div>
            <div className="profile-details">
              <div className="profile-row">
                <span className="profile-label">Account ID</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>#{profile.user_id}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Role</span>
                <span style={{ textTransform: 'capitalize' }}>{profile.role}</span>
              </div>
              {p?.patient_id && (
                <div className="profile-row">
                  <span className="profile-label">Patient ID</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>#{p.patient_id}</span>
                </div>
              )}
              <div className="profile-row">
                <span className="profile-label">Registered Email</span>
                <span>{profile.email}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><h3>🔒 Security</h3></div>
            <p className="muted">Change your password to keep your account secure.</p>
            {pwError && <div className="alert error">{pwError}</div>}
            {pwNotice && <div className="alert success">{pwNotice}</div>}
            <div className="field"><label>Current Password</label>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></div>
            <div className="field"><label>New Password</label>
              <input type="password" placeholder="Min 6 characters" value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} /></div>
            <div className="field"><label>Confirm New Password</label>
              <input type="password" placeholder="Re-enter new password" value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} /></div>
            <button className="btn secondary" onClick={() => {
              setPwError(''); setPwNotice('');
              if (!pwForm.current || !pwForm.newPw) return setPwError('Fill in all fields');
              if (pwForm.newPw.length < 6) return setPwError('Password must be at least 6 characters');
              if (pwForm.newPw !== pwForm.confirm) return setPwError('Passwords do not match');
              api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw })
                .then(() => { setPwNotice('Password changed!'); setPwForm({ current: '', newPw: '', confirm: '' }); })
                .catch((e) => setPwError(e.message));
            }}>Update Password</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
