'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    LogOut,
    Home,
    X,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { adminNavItems } from '@/config/admin-nav';

export function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const links = adminNavItems;

    return (
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
                <Shield className="h-5 w-5 text-indigo-600" />
                Admin Panel
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-[400px] p-0 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <SheetTitle className="font-bold text-lg m-0">เมนู</SheetTitle>
                        <SheetClose asChild>
                            <Button variant="ghost" size="icon">
                                <span className="sr-only">Close</span>
                            </Button>
                        </SheetClose>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant={isActive ? 'secondary' : 'ghost'}
                                        className={cn(
                                            "w-full justify-start gap-3 mb-1",
                                            isActive && "bg-slate-100 text-indigo-600"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                    </Button>
                                </Link>
                            );
                        })}

                        <div className="h-px bg-slate-100 my-4" />

                        <Link href="/" onClick={() => setOpen(false)}>
                            <Button variant="outline" className="w-full gap-2 border-slate-200">
                                <Home className="h-4 w-4" />
                                กลับหน้าหลัก
                            </Button>
                        </Link>
                    </nav>

                    <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50">
                        <form action="/api/auth/signout" method="POST">
                            <Button variant="ghost" className="w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                                <LogOut className="h-4 w-4" />
                                ออกจากระบบ
                            </Button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
