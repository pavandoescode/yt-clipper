"use client";

import { useSidebar } from '@/context/SidebarContext';

export default function MainContent({ children }) {
    const { collapsed } = useSidebar();

    return (
        <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
            {children}
        </main>
    );
}
