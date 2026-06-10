"use client";

import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function useSidebar() {
    return useContext(SidebarContext);
}

export function SidebarProvider({ children }) {
    const [collapsed, setCollapsed] = useState(false);

    const toggleSidebar = () => setCollapsed(!collapsed);

    return (
        <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}
