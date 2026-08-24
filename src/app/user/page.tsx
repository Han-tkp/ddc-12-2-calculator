import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { UserPublicPortal } from '@/components/user/user-public-portal';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Layers, Bot, Sparkles, MapPin, Calculator, CheckCircle2 } from 'lucide-react';
import { thaiToday, thaiStartOfDay, thaiEndOfDay, toThaiDayKey, shiftThaiDayKey } from '@/lib/thai-time';
import { fetchAllRows } from '@/lib/fetch-all-rows';

import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function PublicUserPortalPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>;
}) {
    const { from, to } = await searchParams;

    // "วัน" ยึดตามเวลาไทยเสมอ ไม่ใช่เขตเวลาของเครื่องเซิร์ฟเวอร์ (ดู src/lib/thai-time.ts)
    const startDate = thaiStartOfDay(from ? toThaiDayKey(from) : shiftThaiDayKey(thaiToday(), -30));
    const endDate = thaiEndOfDay(to ? toThaiDayKey(to) : thaiToday());

    const dateFilterStr = {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
    };

    // 1. Fetch calculation data
    // ดึงทีละหน้าจนหมด — PostgREST ตัดที่ 1,000 แถวต่อคำขอโดยไม่แจ้งเตือน
    const { rows: calcData } = await fetchAllRows<any>(() => supabaseAdmin
        .from('calculations')
        .select('chemical, location, createdAt, V_total, lat, lng')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte));

    // 2. Fetch profiles
    const { data: profiles } = await supabaseAdmin
        .from('label_profiles')
        .select('*')
        .eq('isActive', true)
        .order('name', { ascending: true });

    return (
        <div className="min-h-screen bg-slate-50 relative pb-16 font-sans">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4" /> หน้าหลัก
                            </Button>
                        </Link>
                        <div className="h-5 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-xl">👥</span>
                            <h1 className="font-bold text-lg text-slate-800 tracking-tight">
                                ศูนย์ผู้ใช้งานทั่วไป & ปฏิบัติงานภาคสนาม
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <Suspense fallback={
                    <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูลศูนย์ผู้ใช้งาน...</div>
                }>
                    <UserPublicPortal
                        initialCalcData={calcData || []}
                        initialProfiles={profiles || []}
                    />
                </Suspense>
            </main>
        </div>
    );
}
