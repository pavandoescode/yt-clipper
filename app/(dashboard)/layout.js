"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="loading-card" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="app-container">
            <Header />
            <Sidebar />
            <MainContent>
                {children}
            </MainContent>
        </div>
    );
}
