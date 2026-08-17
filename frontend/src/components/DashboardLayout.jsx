import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

export default function DashboardLayout({ children, activeTab }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getNavLinks = () => {
    const role = user?.role;
    if (role === 'student') {
      return [
        { label: 'My Attendance', path: '/dashboard' },
        { label: 'My Disputes', path: '/dashboard/disputes' },
      ];
    }
    if (role === 'teacher') {
      return [
        { label: 'Attendance & Reports', path: '/dashboard' },
        { label: 'Flags & Disputes', path: '/dashboard/review-queue' },
        { label: 'Camera Scan', path: '/dashboard/scan' },
      ];
    }
    if (role === 'admin') {
      return [
        { label: 'System Attendance', path: '/dashboard' },
        { label: 'Audit Logs', path: '/dashboard/audit-logs' },
        { label: 'User Management', path: '/dashboard/users' },
      ];
    }
    return [{ label: 'Dashboard', path: '/dashboard' }];
  };

  const navLinks = getNavLinks();

  return (
    <div className="layout">
      {/* ── Header / Navbar ──────────────────────── */}
      <header className="navbar">
        <div className="navbar__brand">
          <div className="navbar__logo">⚡</div>
          <div className="navbar__titles">
            <span className="navbar__app-name">AAMS</span>
            <span className="navbar__role-tag">{user?.role} Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="navbar__nav">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.path ||
              (activeTab && activeTab === link.label);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Actions */}
        <div className="navbar__user">
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role-badge">{user?.role}</span>
          </div>
          <button className="btn-signout" onClick={logout} title="Sign Out">
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Content Body ────────────────────── */}
      <main className="layout__main">{children}</main>
    </div>
  );
}
