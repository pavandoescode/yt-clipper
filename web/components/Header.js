"use client";

import { useSidebar } from '../context/SidebarContext';

function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleSidebar} title="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <div className="header-logo">
          <img src="/logo.png" alt="YT Clipper Logo" style={{ height: '42px', width: 'auto' }} />
          <span>YT Clipper</span>
        </div>
      </div>

      <style jsx>{`
        .top-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-height);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 200;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px; /* Reduced gap slightly to move logo "left" relative to hamburger */
        }

        .hamburger-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .hamburger-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .hamburger-btn svg {
          width: 24px;
          height: 24px;
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-logo svg {
          width: 42px;
          height: 32px;
          color: var(--accent);
        }

        .header-logo span {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
      `}</style>
    </header>
  );
}

export default Header;
