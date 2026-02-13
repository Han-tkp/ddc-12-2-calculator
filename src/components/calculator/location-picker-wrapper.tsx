'use client';

import dynamic from 'next/dynamic';

const LocationPicker = dynamic(
    () => import('./location-picker').then(mod => ({ default: mod.LocationPicker })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-48 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center">
                <p className="text-slate-400 text-sm">กำลังโหลดแผนที่...</p>
            </div>
        ),
    }
);

interface LocationPickerWrapperProps {
    lat: number | null;
    lng: number | null;
    onLocationChange: (lat: number, lng: number, placeName: string) => void;
    onRequestGPS: () => void;
    gpsStatus: 'idle' | 'loading' | 'success' | 'error';
}

export function LocationPickerWrapper(props: LocationPickerWrapperProps) {
    return <LocationPicker {...props} />;
}
