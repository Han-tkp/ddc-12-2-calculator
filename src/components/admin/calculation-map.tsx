'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPoint {
    id: string;
    lat: number;
    lng: number;
    chemical: string | null;
    location: string | null;
    V_total: number;
    createdAt: string;
}

interface CalculationMapProps {
    points: MapPoint[];
}

export function CalculationMap({ points }: CalculationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    const pointsKey = useMemo(
        () => points.map(p => `${p.id}:${p.lat},${p.lng}`).join('|'),
        [points]
    );

    useEffect(() => {
        if (!mapRef.current) return;

        // Destroy old map if exists
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Default center: สงขลา
        const defaultCenter: [number, number] = [7.19, 100.59];
        const validPoints = points.filter(p => p.lat && p.lng);

        const center = validPoints.length > 0
            ? [validPoints[0].lat, validPoints[0].lng] as [number, number]
            : defaultCenter;

        const map = L.map(mapRef.current).setView(center, validPoints.length > 0 ? 10 : 6);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);

        // Custom icon — small teardrop pin
        const icon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="
                background: #0b724a;
                width: 18px; height: 18px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 18],
            popupAnchor: [0, -18],
        });

        // Add markers
        validPoints.forEach((point) => {
            const date = new Date(point.createdAt).toLocaleString('th-TH', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });

            L.marker([point.lat, point.lng], { icon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family: sans-serif; min-width: 180px;">
                        <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">
                            ${point.chemical || 'ไม่ระบุสูตร'}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">
                            ${point.location || 'ไม่ระบุสถานที่'}<br/>
                            ปริมาณรวม: <strong>${point.V_total.toFixed(2)} cc</strong><br/>
                            ${date}
                        </div>
                    </div>
                `);
        });

        // Fit bounds if multiple points.
        // `animate: false` is deliberate. fitBounds animates by default, and if the map
        // unmounts mid-flight — switching dashboard tabs does exactly that — Leaflet's
        // _onZoomTransitionEnd still fires against panes that no longer exist and throws
        // "Cannot read properties of undefined (reading '_leaflet_pos')".
        if (validPoints.length > 1) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], animate: false });
        }

        return () => {
            // Cancel anything still in flight (a user-initiated zoom, a pan) before
            // tearing the map down, so no transition handler outlives its panes.
            map.stop();
            map.remove();
            mapInstanceRef.current = null;
        };
        // Keyed on the points' content, not the array's identity: callers build this
        // array inline on every render, so depending on `points` rebuilt the whole map
        // on each parent re-render — wasteful, and it widened the unmount race above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointsKey]);

    return (
        <div className="relative">
            <div
                ref={mapRef}
                className="w-full h-96 rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-lg"
            />

            {points.filter(p => p.lat && p.lng).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-2xl">
                    <div className="text-center text-slate-400">
                        <p className="text-lg font-medium">ยังไม่มีข้อมูลพิกัด GPS</p>
                        <p className="text-sm">ข้อมูลจะปรากฏเมื่อมีการบันทึกคำนวณพร้อม GPS</p>
                    </div>
                </div>
            )}

            {/* Points counter badge */}
            {points.filter(p => p.lat && p.lng).length > 0 && (
                <div className="absolute bottom-3 right-3 z-1000">
                    <span className="inline-flex items-center gap-1 text-xs text-white bg-brand/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                        {points.filter(p => p.lat && p.lng).length} จุดปฏิบัติงาน
                    </span>
                </div>
            )}
        </div>
    );
}
