'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { adminNavItems } from '@/config/admin-nav';
import { ChevronLeft, ChevronRight, Home, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface AdminSidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export function AdminSidebar({ isCollapsed, toggleCollapse }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-20 hidden flex-col bg-white border-r border-slate-200 transition-all duration-300 md:flex",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className={cn(
                "flex items-center border-b border-slate-100 h-16",
                isCollapsed ? "justify-center" : "px-6 justify-between"
            )}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                        <span className="text-2xl">🧪</span>
                        Admin
                    </div>
                )}
                {isCollapsed && <span className="text-2xl">🧪</span>}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className={cn("text-slate-400 hover:text-slate-600", isCollapsed && "hidden group-hover:block")}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
                {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    "w-full justify-start mb-1 transition-all",
                                    isActive && "bg-indigo-50 text-indigo-600 font-medium",
                                    isCollapsed ? "px-0 justify-center" : "gap-3 px-3"
                                )}
                            >
                                <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-500")} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 space-y-2">
                <Button
                    variant="outline"
                    onClick={toggleCollapse}
                    className="w-full justify-center md:hidden"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                <Link href="/" title={isCollapsed ? "กลับหน้าหลัก" : undefined}>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full border-slate-200 hover:bg-slate-50 hover:text-indigo-600",
                            isCollapsed ? "px-0 justify-center" : "gap-2"
                        )}
                    >
                        <Home className="h-4 w-4" />
                        {!isCollapsed && "กลับหน้าหลัก"}
                    </Button>
                </Link>

                <Button
                    variant="ghost"
                    className={cn(
                        "w-full text-red-500 hover:text-red-600 hover:bg-red-50",
                        isCollapsed ? "px-0 justify-center" : "gap-2"
                    )}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title={isCollapsed ? "ออกจากระบบ" : undefined}
                >
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && "ออกจากระบบ"}
                </Button>
            </div>
        </aside>
    );
}
