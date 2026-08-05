'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import { Layers, Flame } from 'lucide-react';
import { BRAND } from '@/lib/theme';

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

type MapView = 'cluster' | 'heat';

export function CalculationMap({ points }: CalculationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const clusterLayerRef = useRef<L.MarkerClusterGroup | null>(null);
    const heatLayerRef = useRef<L.HeatLayer | null>(null);
    const [view, setView] = useState<MapView>('cluster');

    const pointsKey = useMemo(
        () => points.map(p => `${p.id}:${p.lat},${p.lng}`).join('|'),
        [points]
    );

    // Cluster bubble color follows the same density tiers as the legend below —
    // small clusters read as routine coverage, large ones flag areas worth a look.
    const clusterColorFor = (count: number) => {
        if (count >= 50) return BRAND.critical;
        if (count >= 10) return BRAND.warn;
        return BRAND.accent;
    };

    useEffect(() => {
        if (!mapRef.current) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

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

        const icon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="
                background: ${BRAND.accent};
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

        const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 60,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                const color = clusterColorFor(count);
                const size = count >= 50 ? 44 : count >= 10 ? 38 : 32;
                return L.divIcon({
                    html: `<div style="
                        width: ${size}px; height: ${size}px;
                        background: ${color};
                        color: white;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 1px 6px rgba(0,0,0,0.35);
                        display: flex; align-items: center; justify-content: center;
                        font-family: sans-serif; font-weight: 700; font-size: 12px;
                    ">${count}</div>`,
                    className: 'custom-cluster-marker',
                    iconSize: L.point(size, size),
                });
            },
        });

        validPoints.forEach((point) => {
            const date = new Date(point.createdAt).toLocaleString('th-TH', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });

            clusterGroup.addLayer(
                L.marker([point.lat, point.lng], { icon }).bindPopup(`
                    <div style="font-family: sans-serif; min-width: 180px;">
                        <div style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;">
                            ${point.chemical || 'ไม่ระบุสูตร'}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">
                            ${point.location || 'ไม่ระบุสถานที่'}<br/>
                            ปริมาณรวม: <strong>${point.V_total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} มล.</strong><br/>
                            ${date}
                        </div>
                    </div>
                `)
            );
        });
        clusterLayerRef.current = clusterGroup;

        // Weighted by V_total so higher-volume operations read hotter, not just
        // higher-frequency ones. Normalized against the max so the scale adapts
        // to whatever date range/filter is currently selected.
        const maxVolume = Math.max(1, ...validPoints.map(p => p.V_total || 0));
        const heatPoints: [number, number, number][] = validPoints.map(p => [
            p.lat,
            p.lng,
            0.3 + 0.7 * Math.min(1, (p.V_total || 0) / maxVolume),
        ]);
        const heatLayer = L.heatLayer(heatPoints, {
            radius: 30,
            blur: 20,
            // Caps the intensity a pixel needs to hit full saturation. leaflet.heat's
            // default (1.0) assumes many overlapping points; this dashboard is often
            // viewed zoomed out over a whole province with points spread thin, so the
            // accumulated intensity per pixel rarely gets anywhere near 1.0 and the
            // heat layer renders nearly invisible. 0.35 makes a single real point read
            // clearly instead of needing a dense cluster to become visible.
            max: 0.35,
            minOpacity: 0.35,
            gradient: { 0.2: BRAND.soft, 0.5: BRAND.accent, 0.8: BRAND.warn, 1.0: BRAND.critical },
        });
        heatLayerRef.current = heatLayer;

        (view === 'cluster' ? clusterGroup : heatLayer).addTo(map);

        if (validPoints.length > 1) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], animate: false });
        }

        return () => {
            map.stop();
            map.remove();
            mapInstanceRef.current = null;
            clusterLayerRef.current = null;
            heatLayerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointsKey]);

    // Swapping the visible layer doesn't need to rebuild the whole map — just
    // toggle which of the two pre-built layers is attached.
    useEffect(() => {
        const map = mapInstanceRef.current;
        const clusterLayer = clusterLayerRef.current;
        const heatLayer = heatLayerRef.current;
        if (!map || !clusterLayer || !heatLayer) return;

        if (view === 'cluster') {
            if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
            if (!map.hasLayer(clusterLayer)) clusterLayer.addTo(map);
        } else {
            if (map.hasLayer(clusterLayer)) map.removeLayer(clusterLayer);
            if (!map.hasLayer(heatLayer)) heatLayer.addTo(map);
        }
    }, [view]);

    const validCount = points.filter(p => p.lat && p.lng).length;

    return (
        <div className="relative">
            <div
                ref={mapRef}
                className="w-full h-96 rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-lg"
            />

            {validCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-2xl">
                    <div className="text-center text-slate-400">
                        <p className="text-lg font-medium">ยังไม่มีข้อมูลพิกัด GPS</p>
                        <p className="text-sm">ข้อมูลจะปรากฏเมื่อมีการบันทึกคำนวณพร้อม GPS</p>
                    </div>
                </div>
            )}

            {validCount > 0 && (
                <>
                    <div className="absolute top-3 right-3 z-1000 flex gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-full shadow-lg ring-1 ring-black/5">
                        <button
                            type="button"
                            onClick={() => setView('cluster')}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                view === 'cluster' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" /> คลัสเตอร์
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('heat')}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                view === 'heat' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <Flame className="h-3.5 w-3.5" /> ความหนาแน่น
                        </button>
                    </div>

                    <div className="absolute bottom-3 right-3 z-1000">
                        <span className="inline-flex items-center gap-1 text-xs text-white bg-brand/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                            {validCount} จุดปฏิบัติงาน
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
