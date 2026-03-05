'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Trash2, History, Clock, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/calculations';

interface CalculationHistoryItem {
    id: string;
    createdAt: string;
    // Inputs
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    A0: number;
    A_house: number;
    N: number;
    // Results
    V_per_house: number;
    V_total: number;
    V_C: number;
    V_S: number;
}

export function HistoryList({ refreshTrigger }: { refreshTrigger: number }) {
    const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/calculations');
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [refreshTrigger]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/calculations/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
                toast.success('ลบประวัติเรียบร้อย');
            } else {
                toast.error('ลบไม่สำเร็จ');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    if (isLoading && history.length === 0) {
        return <div className="text-center py-4 text-slate-500">กำลังโหลดข้อมูล...</div>;
    }

    if (history.length === 0) {
        return null; // Don't show if empty
    }

    return (
        <div className="mt-8 space-y-4 animate-fade-up">
            <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-4 h-auto glass-card hover:bg-white/50 dark:hover:bg-slate-800/50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-lg">ประวัติการคำนวณล่าสุด ({history.length})</span>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>

            {isExpanded && (
                <div className="grid gap-4">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="glass-card p-4 rounded-xl relative group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all border border-slate-200/50"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(item.createdAt), 'd MMM yyyy HH:mm', { locale: th })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 -mt-1 -mr-1"
                                    onClick={(e) => handleDelete(item.id, e)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs text-muted-foreground">สัดส่วน (C:S)</p>
                                    <p className="font-medium">{item.C}:{item.S}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs text-muted-foreground">จำนวนบ้าน</p>
                                    <p className="font-medium">{item.N} หลัง</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs text-muted-foreground">ใช้ต่อหลัง</p>
                                    <p className="font-medium text-blue-600 dark:text-blue-400">
                                        {formatNumber(item.V_per_house)} cc
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs text-muted-foreground">ยอดรวมทั้งหมด</p>
                                    <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                        {formatNumber(item.V_total)} cc
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
