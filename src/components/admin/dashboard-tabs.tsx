'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, Users, FileText } from 'lucide-react';
import type { ReactNode } from 'react';

interface DashboardTabsProps {
    defaultValue: string;
    children: ReactNode;
}

export function DashboardTabs({ defaultValue, children }: DashboardTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'operational') params.delete('tab');
        else params.set('tab', value);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <Tabs value={defaultValue} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-slate-100 p-1 w-full md:w-auto h-auto flex-wrap sm:flex-nowrap justify-start border border-slate-200/50 rounded-xl mb-4 lg:mb-0">
                <TabsTrigger value="operational" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">ปฏิบัติการ</span>
                    <span className="sm:hidden">Opera</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">วิเคราะห์เชิงลึก</span>
                    <span className="sm:hidden">Analy</span>
                </TabsTrigger>
                <TabsTrigger value="strategic" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">กลยุทธ์และเป้าหมาย</span>
                    <span className="sm:hidden">Strate</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">ประวัติทั้งหมด</span>
                    <span className="sm:hidden">Hist</span>
                </TabsTrigger>
            </TabsList>
            {children}
        </Tabs>
    );
}
