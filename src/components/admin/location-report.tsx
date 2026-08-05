'use client';

import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface LocationReportProps {
    locations: {
        name: string;
        count: number;
        chemical: string | null;
        lastUsed: string;
    }[];
}

export function LocationReport({ locations }: LocationReportProps) {
    const [showAll, setShowAll] = useState(false);
    const displayed = showAll ? locations : locations.slice(0, 5);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>สถานที่</span>
                <span>จำนวนครั้ง</span>
            </div>

            {/* Location Rows */}
            <div className="space-y-2">
                {displayed.map((loc, i) => (
                    <div
                        key={loc.name + i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-slate-100 hover:bg-brand-soft/50 transition-colors group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-brand/60 to-brand/60 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                    {loc.name}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {loc.chemical || 'หลายสูตร'} • {loc.lastUsed}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="text-right">
                                <span className="text-lg font-bold text-brand">{loc.count.toLocaleString('th-TH')}</span>
                                <span className="text-xs text-slate-400 ml-1">ครั้ง</span>
                            </div>
                            {/* Usage bar */}
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-brand/60 to-brand/60 rounded-full transition-all"
                                    style={{ width: `${Math.min((loc.count / (locations[0]?.count || 1)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show All Toggle */}
            {locations.length > 5 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full flex items-center justify-center gap-1 text-sm text-brand hover:text-brand-dark py-2 rounded-lg hover:bg-brand-soft transition-colors"
                >
                    {showAll ? (
                        <>แสดงน้อยลง <ChevronUp className="h-4 w-4" /></>
                    ) : (
                        <>ดูทั้งหมด ({locations.length} สถานที่) <ChevronDown className="h-4 w-4" /></>
                    )}
                </button>
            )}

            {/* Empty State */}
            {locations.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ยังไม่มีข้อมูลสถานที่</p>
                </div>
            )}
        </div>
    );
}
