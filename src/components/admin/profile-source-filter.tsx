'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Layers, ShieldCheck, User, Users, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Same toggle-group pattern as RoleFilter, but for the `source` param used to
 * filter label_profiles by how they were added (see src/lib/profile-source.ts). */
export function ProfileSourceFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = searchParams.get('source') || 'all';

    const handleChange = (source: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (source === 'all') params.delete('source');
        else params.set('source', source);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const options = [
        { value: 'all', label: 'ทั้งหมด', icon: Users },
        { value: 'default', label: 'ค่าเริ่มต้น', icon: Layers },
        { value: 'admin', label: 'ผู้ดูแลระบบ', icon: ShieldCheck },
        { value: 'guest', label: 'ผู้ใช้ทั่วไป', icon: User },
        { value: 'file-import', label: 'นำเข้าไฟล์', icon: FileUp },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 overflow-x-auto">
            {options.map((opt) => {
                const Icon = opt.icon;
                const isActive = current === opt.value;
                return (
                    <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChange(opt.value)}
                        className={cn(
                            'h-8 text-xs gap-1.5 rounded-lg transition-all shrink-0',
                            isActive
                                ? 'bg-white text-brand font-medium shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
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
