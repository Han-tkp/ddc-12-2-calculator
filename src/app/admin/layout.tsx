import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    LogOut,
    Home,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/admin/mobile-nav';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile Nav */}
            <MobileNav />

            {/* Sidebar - Desktop */}
            <aside className="w-64 bg-white border-r border-slate-200 fixed h-full hidden md:flex flex-col z-20">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                        <span className="text-2xl">🧪</span>
                        Admin
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/admin/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-slate-50">
                            <LayoutDashboard className="h-4 w-4 text-slate-500" />
                            ภาพรวม
                        </Button>
                    </Link>
                    <Link href="/admin/users">
                        <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-slate-50">
                            <Users className="h-4 w-4 text-slate-500" />
                            จัดการผู้ใช้
                        </Button>
                    </Link>
                    <div className="h-px bg-slate-100 my-2" />
                    <Link href="/admin/profiles">
                        <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-slate-50">
                            <Settings className="h-4 w-4 text-slate-500" />
                            จัดการสูตร
                        </Button>
                    </Link>
                    <Link href="/admin/feedback">
                        <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-slate-50">
                            <MessageSquare className="h-4 w-4 text-slate-500" />
                            กล่องข้อความ
                        </Button>
                    </Link>
                    <Link href="/admin/logs">
                        <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-slate-50">
                            <FileText className="h-4 w-4 text-slate-500" />
                            ประวัติคำนวณ
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Link href="/">
                        <Button variant="outline" className="w-full gap-2 border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                            <Home className="h-4 w-4" />
                            กลับหน้าหลัก
                        </Button>
                    </Link>
                    <form action={async () => {
                        'use server';
                        const { signOut } = await import('@/lib/auth');
                        await signOut({ redirectTo: '/login' });
                    }}>
                        <Button variant="ghost" className="w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 mt-2">
                            <LogOut className="h-4 w-4" />
                            ออกจากระบบ
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 md:p-8">
                {children}
            </main>
        </div>
    );
}
