"use client";

import { useSidebar } from '../context/SidebarContext';
import styles from './Header.module.css';

function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <button className={styles.hamburgerBtn} onClick={toggleSidebar} title="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <div className={styles.headerLogo}>
          <img src="/logo.png" alt="YT Clipper Logo" style={{ height: '42px', width: 'auto' }} />
          <span>YT Clipper</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
