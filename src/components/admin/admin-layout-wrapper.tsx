'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { MobileNav } from './mobile-nav';
import { cn } from '@/lib/utils';

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    // Initialize collapsed state from localStorage if available, default to false
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem('admin-sidebar-collapsed');
        if (stored) {
            setIsCollapsed(stored === 'true');
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('admin-sidebar-collapsed', String(newState));
    };

    if (!isMounted) {
        return null; // or a loading skeleton
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile Nav */}
            <MobileNav />

            {/* Desktop Sidebar */}
            <AdminSidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />

            {/* Main Content */}
            <main
                className={cn(
                    "flex-1 p-6 md:p-8 transition-all duration-300 ease-in-out",
                    isCollapsed ? "md:ml-20" : "md:ml-64"
                )}
            >
                {children}
            </main>
        </div>
    );
}
