"use client";

import { useSidebar } from '@/context/SidebarContext';
import styles from './MainContent.module.css';

export default function MainContent({ children }) {
    const { collapsed } = useSidebar();

    return (
        <main className={`${styles.mainContent} ${collapsed ? styles.collapsed : ''}`}>
            {children}
        </main>
    );
}
