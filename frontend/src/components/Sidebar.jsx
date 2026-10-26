import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  Dashboard: '📊',
  Patients: '🧑‍🤝‍🧑',
  Doctors: '🩺',
  Departments: '🏥',
  Appointments: '📅',
  'My Appointments': '📅',
  Billing: '💳',
  'My Bills': '💳',
  Inventory: '📦',
  Admissions: '🛏️',
  'Medical Records': '📋',
  'My Records': '📋',
  'My Profile': '👤',
  Profile: '👤',
};

const LINKS_BY_ROLE = {
  admin: [
    { to: '/', label: 'Dashboard' },
    { to: '/patients', label: 'Patients' },
    { to: '/doctors', label: 'Doctors' },
    { to: '/departments', label: 'Departments' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/billing', label: 'Billing' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/admissions', label: 'Admissions' },
    { to: '/profile', label: 'Profile' },
  ],
  receptionist: [
    { to: '/', label: 'Dashboard' },
    { to: '/patients', label: 'Patients' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/billing', label: 'Billing' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/admissions', label: 'Admissions' },
    { to: '/profile', label: 'Profile' },
  ],
  doctor: [
    { to: '/', label: 'Dashboard' },
    { to: '/appointments', label: 'My Appointments' },
    { to: '/medical-records', label: 'Medical Records' },
    { to: '/admissions', label: 'Admissions' },
    { to: '/profile', label: 'My Profile' },
  ],
  patient: [
    { to: '/', label: 'Dashboard' },
    { to: '/appointments', label: 'My Appointments' },
    { to: '/medical-records', label: 'My Records' },
    { to: '/billing', label: 'My Bills' },
    { to: '/profile', label: 'My Profile' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const links = LINKS_BY_ROLE[user.role] || [];

  return (
    <nav className="sidebar">
      <div className="brand">Meridian<span>Health</span></div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{ICONS[l.label] || '•'}</span>
          {l.label}
        </NavLink>
      ))}
      <div className="role-tag">{user.role}</div>
    </nav>
  );
}
