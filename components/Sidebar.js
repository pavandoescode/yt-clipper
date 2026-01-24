"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import styles from './Sidebar.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const fetchSavedCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/clips/saved`, {
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
    if (typeof window !== 'undefined') {
      window.addEventListener('clipSaved', handleClipSaved);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('clipSaved', handleClipSaved);
      }
    };
  }, [user]);

  const isActive = (path) => pathname === path;

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <nav className={styles.sidebarNav}>
        <Link href="/" className={`${styles.sidebarLink} ${isActive('/') ? styles.active : ''}`} title="Clips">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 0 0 .707-1.707l-9-9a.999.999 0 0 0-1.414 0l-9 9A1 1 0 0 0 3 13zm7 7v-5h4v5h-4zm2-15.586 6 6V20h-3v-5c0-1.103-.897-2-2-2h-4c-1.103 0-2 .897-2 2v5H6v-9.586l6-6z" />
          </svg>
          <span>Clips</span>
        </Link>

        <Link href="/saved" className={`${styles.sidebarLink} ${isActive('/saved') ? styles.active : ''}`} title="Saved Clips">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M18 2H6c-1.103 0-2 .897-2 2v18l8-4.572L20 22V4c0-1.103-.897-2-2-2zm0 16.553-6-3.428-6 3.428V4h12v14.553z" />
          </svg>
          <span>Saved Clips</span>
          {savedCount > 0 && <span className={styles.sidebarBadge}>{savedCount}</span>}
        </Link>

        <Link href="/livestreams" className={`${styles.sidebarLink} ${isActive('/livestreams') ? styles.active : ''}`} title="Live Streams">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          <span>Live Streams</span>
        </Link>

        <Link href="/history" className={`${styles.sidebarLink} ${isActive('/history') ? styles.active : ''}`} title="History">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <span>History</span>
        </Link>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.sidebarUser} onClick={() => router.push('/profile')}>
          <div className={styles.userAvatar}>
            U
          </div>
          <span className={styles.userEmail}>User</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

