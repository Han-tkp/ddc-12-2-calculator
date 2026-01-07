'use client';

import { formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Printer, FlaskConical, Droplets, Home, Beaker, Sparkles, CheckCircle } from 'lucide-react';

interface ResultsDisplayProps {
    result: {
        V_per_house: number;
        V_total: number;
        V_C: number;
        V_S: number;
        V_C_1L: number;
    };
    input: {
        C: number;
        S: number;
        RA: number;
        RA_unit: string;
        A0: number;
        A_house: number;
        N: number;
    };
}

export function ResultsDisplay({ result, input }: ResultsDisplayProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-bounce-in print:shadow-none">
            {/* Success Header */}
            <div className="relative bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 p-6">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                ผลการคำนวณ
                                <Sparkles className="h-5 w-5" />
                            </h2>
                            <p className="text-white/80 text-sm">
                                สูตร {input.C}:{input.S} • {input.N} หลัง
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrint}
                        className="text-white hover:bg-white/20 print:hidden"
                    >
                        <Printer className="h-4 w-4 mr-1" />
                        พิมพ์
                    </Button>
                </div>
            </div>

            {/* Main Results - Bento Grid */}
            <div className="p-6">
                {/* Big Summary Card */}
                <div className="bento-item bento-item-large bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-4 hover-lift animate-pulse-glow">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        📋 สรุปสิ่งที่ต้องเตรียม
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Droplets className="h-8 w-8" />
                                <span className="text-emerald-100">ยาฆ่ายุง</span>
                            </div>
                            <p className="text-4xl font-extrabold">{formatNumber(result.V_C)} <span className="text-lg font-normal">ซีซี</span></p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Beaker className="h-8 w-8" />
                                <span className="text-emerald-100">น้ำมัน/น้ำ</span>
                            </div>
                            <p className="text-4xl font-extrabold">{formatNumber(result.V_S)} <span className="text-lg font-normal">ซีซี</span></p>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/30">
                        <p className="text-emerald-100">รวมส่วนผสมทั้งหมด</p>
                        <p className="text-5xl font-extrabold">
                            {formatNumber(result.V_total)} <span className="text-xl font-normal">ซีซี</span>
                            <span className="text-lg font-normal text-emerald-200 ml-2">
                                ({formatNumber(result.V_total / 1000, 2)} ลิตร)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Detail Grid */}
                <div className="bento-grid">
                    <BentoResultCard
                        icon={<Home className="h-5 w-5" />}
                        emoji="🏠"
                        label="ใช้ต่อหลัง"
                        value={formatNumber(result.V_per_house)}
                        unit="ซีซี"
                        description="ปริมาณพ่นแต่ละบ้าน"
                        gradient="from-blue-400 to-blue-600"
                    />

                    <BentoResultCard
                        icon={<Droplets className="h-5 w-5" />}
                        emoji="💧"
                        label="ยาใน 1 ลิตร"
                        value={formatNumber(result.V_C_1L)}
                        unit="ซีซี"
                        description="เมื่อผสม 1 ลิตร"
                        gradient="from-indigo-400 to-indigo-600"
                    />

                    <BentoResultCard
                        icon={<Beaker className="h-5 w-5" />}
                        emoji="🫗"
                        label="น้ำมันใน 1 ลิตร"
                        value={formatNumber(1000 - result.V_C_1L)}
                        unit="ซีซี"
                        description="เมื่อผสม 1 ลิตร"
                        gradient="from-amber-400 to-orange-500"
                    />
                </div>

                {/* Print Instructions */}
                <div className="mt-6 p-5 glass-card rounded-2xl border border-slate-200/50 print:break-inside-avoid">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-700">
                        <span className="text-xl">📝</span>
                        วิธีผสม (สำหรับพิมพ์)
                    </h4>
                    <ol className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">1</span>
                            <span>เตรียม <strong className="text-blue-600">{formatNumber(result.V_C)} ซีซี</strong> ของยาฆ่ายุง</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">2</span>
                            <span>เตรียม <strong className="text-amber-600">{formatNumber(result.V_S)} ซีซี</strong> ของน้ำมัน/น้ำ</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shrink-0">3</span>
                            <span>ผสมเข้าด้วยกัน ได้ <strong className="text-green-600">{formatNumber(result.V_total)} ซีซี ({formatNumber(result.V_total / 1000, 2)} ลิตร)</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold shrink-0">4</span>
                            <span>พ่นบ้านละ <strong className="text-pink-600">{formatNumber(result.V_per_house)} ซีซี</strong></span>
                        </li>
                    </ol>
                    <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-200">
                        สูตร: {input.C}:{input.S} | พื้นที่หลังละ {input.A_house} ตร.ม. | จำนวน {input.N} หลัง
                    </p>
                </div>
            </div>
        </div>
    );
}

function BentoResultCard({
    icon,
    emoji,
    label,
    value,
    unit,
    description,
    gradient,
}: {
    icon: React.ReactNode;
    emoji: string;
    label: string;
    value: string;
    unit: string;
    description: string;
    gradient: string;
}) {
    return (
        <div className="bento-item glass-card border border-white/50 hover-lift group">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-white">{icon}</span>
                </div>
                <span className="text-2xl">{emoji}</span>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                {value} <span className="text-sm font-normal text-slate-500">{unit}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">{description}</p>
        </div>
    );
}
