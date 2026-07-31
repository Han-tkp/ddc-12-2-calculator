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
            <div className="overflow-x-auto -mx-4 px-4">
                <TabsList className="bg-slate-100 p-1 w-max min-w-full md:w-full h-auto flex-nowrap justify-start border border-slate-200/50 rounded-xl mb-4 lg:mb-0">
                    <TabsTrigger value="operational" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2 whitespace-nowrap">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>ปฏิบัติการ</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2 whitespace-nowrap">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        <span>วิเคราะห์เชิงลึก</span>
                    </TabsTrigger>
                    <TabsTrigger value="strategic" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2 whitespace-nowrap">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>กลยุทธ์และเป้าหมาย</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-sm px-4 py-2 rounded-lg gap-2 whitespace-nowrap">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>ประวัติทั้งหมด</span>
                    </TabsTrigger>
                </TabsList>
            </div>
            {children}
        </Tabs>
    );
}
