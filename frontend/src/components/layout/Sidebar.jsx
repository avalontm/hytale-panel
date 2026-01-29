import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Terminal,
  FolderOpen,
  Package,
  Settings,
  Users,
  LogOut,
  Globe,
  Info,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { PANEL_VERSION } from '../../config';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { showConfirm } = useDialog();

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to log out of the Hytale Panel?',
      'Confirm Logout'
    );

    if (confirmed) {
      logout();
    }
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/console', icon: Terminal, label: 'Console' },
    { path: '/files', icon: FolderOpen, label: 'Files' },
    { path: '/plugins', icon: Package, label: 'Plugins' },
    { path: '/universes', icon: Globe, label: 'Universes' },
    { path: '/players', icon: Users, label: 'Players' },
  ];

  // Only show Users tab to admins
  if (user?.role === 'admin') {
    menuItems.push({ path: '/users', icon: Users, label: 'Users' });
  }

  // Settings and About are for everyone
  menuItems.push({ path: '/settings', icon: Settings, label: 'Settings' });
  menuItems.push({ path: '/about', icon: Info, label: 'About' });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/static/images/logo-h.png" alt="Hytale Panel" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-profile-info">
            <div className="user-avatar-sm">
              <UserIcon size={14} />
            </div>
            <div className="user-details">
              <span className="username">{user?.user}</span>
              <span className="user-role">{user?.role === 'admin' ? 'Primary Admin' : 'Collaborator'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
        <div className="server-version">
          <span className="version-label">Version</span>
          <span className="version-number">{PANEL_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
