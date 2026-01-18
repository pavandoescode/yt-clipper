import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { API_URL } from '../config/api';

function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const fetchSavedCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/clips/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedCount(response.data.clips?.length || 0);
      } catch (error) {
        console.error('Error fetching saved count:', error);
      }
    };

    if (user) {
      fetchSavedCount();
    }

    // Listen for save events to update count live
    const handleClipSaved = () => fetchSavedCount();
    window.addEventListener('clipSaved', handleClipSaved);

    return () => {
      window.removeEventListener('clipSaved', handleClipSaved);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Dashboard">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 0 0 .707-1.707l-9-9a.999.999 0 0 0-1.414 0l-9 9A1 1 0 0 0 3 13zm7 7v-5h4v5h-4zm2-15.586 6 6V20h-3v-5c0-1.103-.897-2-2-2h-4c-1.103 0-2 .897-2 2v5H6v-9.586l6-6z" />
          </svg>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/saved" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Saved Clips">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6c-1.103 0-2 .897-2 2v18l8-4.572L20 22V4c0-1.103-.897-2-2-2zm0 16.553-6-3.428-6 3.428V4h12v14.553z" />
          </svg>
          <span>Saved Clips</span>
          {savedCount > 0 && <span className="sidebar-badge">{savedCount}</span>}
        </NavLink>

        <NavLink to="/livestreams" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Live Streams">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          <span>Live Streams</span>
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="History">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <span>History</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">
            U
          </div>
          <span className="user-email">User</span>
        </div>
        <button className="btn btn-ghost sidebar-logout" onClick={handleLogout} title="Logout">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 13v-2H7V8l-5 4 5 4v-3z" /><path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z" />
          </svg>
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: var(--header-height);
          width: var(--sidebar-width);
          height: calc(100vh - var(--header-height));
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .sidebar.collapsed {
          width: 72px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sidebar.collapsed .sidebar-nav {
          padding: 16px 8px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          transition: var(--transition);
          position: relative;
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-link {
          padding: 14px;
          justify-content: center;
        }

        .sidebar.collapsed .sidebar-link span {
          display: none;
        }

        .sidebar-link:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .sidebar-link.active {
          background: var(--bg-active);
          color: var(--accent);
        }

        .sidebar-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: var(--accent);
          border-radius: 0 4px 4px 0;
        }

        .sidebar-link svg {
          width: 24px;
          height: 24px;
          min-width: 24px;
          opacity: 0.9;
        }

        .sidebar.collapsed .sidebar-link svg {
          width: 28px;
          height: 28px;
          min-width: 28px;
        }

        .sidebar-badge {
          margin-left: auto;
          background: var(--accent);
          color: #000000;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          min-width: 20px;
          text-align: center;
        }

        .sidebar.collapsed .sidebar-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          padding: 2px 5px;
          font-size: 10px;
          min-width: 16px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
          background: var(--bg-primary);
        }

        .sidebar.collapsed .sidebar-footer {
          padding: 12px 8px;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          margin-bottom: 10px;
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-user {
          padding: 8px;
          justify-content: center;
        }

        .sidebar.collapsed .sidebar-user .user-email {
          display: none;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 50%;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #000000;
        }

        .user-email {
          font-size: 13px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .sidebar-logout {
          width: 100%;
          justify-content: flex-start;
          padding: 12px 14px;
          color: var(--text-muted);
          border-radius: var(--radius-md);
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-logout {
          padding: 12px;
          justify-content: center;
        }

        .sidebar.collapsed .sidebar-logout span {
          display: none;
        }

        .sidebar-logout:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .sidebar-logout svg {
          width: 18px;
          height: 18px;
          min-width: 18px;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
