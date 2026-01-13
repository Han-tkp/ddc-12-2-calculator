'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar } from 'lucide-react';

export function DateRangeFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
    const [toDate, setToDate] = useState(searchParams.get('to') || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());

        if (fromDate) params.set('from', fromDate);
        else params.delete('from');

        if (toDate) params.set('to', toDate);
        else params.delete('to');

        router.push(`/admin/dashboard?${params.toString()}`);
    };

    const clearFilter = () => {
        setFromDate('');
        setToDate('');
        router.push('/admin/dashboard');
    };

    return (
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100 mb-6">
            <div className="grid gap-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 ml-1">ตั้งแต่วันที่</label>
                <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="pl-8 bg-slate-50 border-slate-200"
                    />
                </div>
            </div>
            <div className="grid gap-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 ml-1">ถึงวันที่</label>
                <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="pl-8 bg-slate-50 border-slate-200"
                    />
                </div>
            </div>
            <div className="flex gap-2 pb-0.5">
                <Button type="submit" size="icon" className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700">
                    <Search className="h-4 w-4" />
                </Button>
                {(fromDate || toDate) && (
                    <Button type="button" variant="outline" onClick={clearFilter} className="h-10 text-slate-500">
                        รีเซ็ต
                    </Button>
                )}
            </div>
        </form>
    );
}
