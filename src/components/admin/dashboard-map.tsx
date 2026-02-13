'use client';

import dynamic from 'next/dynamic';

const CalculationMap = dynamic(
    () => import('./calculation-map').then(mod => ({ default: mod.CalculationMap })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-100 rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center">
                <p className="text-slate-400">กำลังโหลดแผนที่...</p>
            </div>
        ),
    }
);

interface MapPoint {
    id: string;
    lat: number;
    lng: number;
    chemical: string | null;
    location: string | null;
    V_total: number;
    createdAt: string;
}

export function DashboardMap({ points }: { points: MapPoint[] }) {
    return <CalculationMap points={points} />;
}
