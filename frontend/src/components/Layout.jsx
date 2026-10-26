import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="muted">{greeting}, {user.name}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
        {children}
      </main>
    </div>
  );
}
