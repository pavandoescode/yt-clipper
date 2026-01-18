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
          <svg viewBox="0 0 122.88 86.43" fill="currentColor">
            <path d="M121.63,18.65s-1.2-8.47-4.9-12.19c-4.67-4.89-9.91-4.92-12.31-5.21C87.24,0,61.43,0,61.43,0h0s-25.8,0-43,1.25c-2.4.29-7.63.31-12.31,5.21C2.4,10.18,1.22,18.65,1.22,18.65A187.15,187.15,0,0,0,0,38.55v9.31a187.65,187.65,0,0,0,1.22,19.9S2.42,76.23,6.09,80c4.68,4.9,10.82,4.74,13.57,5.26,9.83.94,41.78,1.22,41.78,1.22s25.83,0,43-1.27c2.41-.29,7.64-.32,12.32-5.21,3.69-3.72,4.89-12.2,4.89-12.2a187.15,187.15,0,0,0,1.22-19.9V38.54a189.26,189.26,0,0,0-1.25-19.9Z" />
            <polygon fill="#000000" points="48.71 59.16 48.71 24.63 81.9 41.95 48.71 59.16 48.71 59.16" />
          </svg>
          <span>YT Clipper</span>
        </div>
      </div>

      <style>{`
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
          gap: 16px;
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
