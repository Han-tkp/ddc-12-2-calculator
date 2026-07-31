'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Shield, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleFilterProps {
    allLabel?: string;
    adminLabel?: string;
    userLabel?: string;
}

export function RoleFilter({
    allLabel = 'ทั้งหมด',
    adminLabel = 'Admin',
    userLabel = 'ผู้ใช้',
}: RoleFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentRole = searchParams.get('role') || 'all';

    const handleChange = (role: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (role === 'all') params.delete('role');
        else params.set('role', role);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const options = [
        { value: 'all', label: allLabel, icon: Users },
        { value: 'admin', label: adminLabel, icon: Shield },
        { value: 'user', label: userLabel, icon: User },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
            {options.map((opt) => {
                const Icon = opt.icon;
                const isActive = currentRole === opt.value;
                return (
                    <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChange(opt.value)}
                        className={cn(
                            "h-8 text-xs gap-1.5 rounded-lg transition-all",
                            isActive
                                ? "bg-white text-indigo-600 font-medium shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                    </Button>
                );
            })}
        </div>
    );
}
