'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar } from 'lucide-react';

export function DateRangeFilter() {
    const router = useRouter();
    const pathname = usePathname();
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

        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilter = () => {
        setFromDate('');
        setToDate('');
        router.push(pathname);
    };

    return (
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-2 w-full sm:w-auto">
            <div className="flex flex-row items-end gap-2 w-full">
                <div className="grid gap-1 flex-1">
                    <label className="text-[10px] sm:text-xs font-medium text-slate-500 ml-1">ตั้งแต่วันที่</label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="pl-8 h-9 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>
                <div className="grid gap-1 flex-1">
                    <label className="text-[10px] sm:text-xs font-medium text-slate-500 ml-1">ถึงวันที่</label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="pl-8 h-9 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button type="submit" size="icon" className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-sm">
                        <Search className="h-4 w-4" />
                    </Button>
                    {(fromDate || toDate) && (
                        <Button type="button" variant="outline" onClick={clearFilter} className="h-9 px-2 text-xs text-slate-500">
                            รีเซ็ต
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
