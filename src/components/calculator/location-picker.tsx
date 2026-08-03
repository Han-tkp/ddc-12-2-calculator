'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
    lat: number | null;
    lng: number | null;
    onLocationChange: (lat: number, lng: number, placeName: string) => void;
    onRequestGPS: () => void;
    gpsStatus: 'idle' | 'loading' | 'success' | 'error';
}

// Reverse Geocoding: ดึงชื่อ POI ใกล้เคียง (zoom=18 = ระดับอาคาร)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th&zoom=18&addressdetails=1&namedetails=1`
        );
        const data = await res.json().catch(() => ({}));

        // Priority 1: POI name (เช่น โลตัสสงขลา, ราชภัฏสงขลา)
        if (data.namedetails?.name) {
            return data.namedetails.name;
        }

        // Priority 2: address building/amenity name
        if (data.address) {
            const poi = data.address.building
                || data.address.amenity
                || data.address.shop
                || data.address.leisure
                || data.address.tourism
                || data.address.office;
            if (poi) return poi;
        }

        // Priority 3: display name shortened
        if (data.name && data.name !== data.address?.road) {
            return data.name;
        }

        // Priority 4: Build from address parts
        if (data.address) {
            const parts = [
                data.address.road,
                data.address.village || data.address.suburb || data.address.neighbourhood,
                data.address.subdistrict || data.address.town,
                data.address.city || data.address.county,
                data.address.state || data.address.province,
            ].filter(Boolean);
            return parts.slice(0, 3).join(', ');
        }

        return data.display_name?.split(',').slice(0, 2).join(', ') || '';
    } catch {
        return '';
    }
}

export function LocationPicker({ lat, lng, onLocationChange, onRequestGPS, gpsStatus }: LocationPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    // Reverse geocode and notify parent
    const handleMarkerMove = useCallback(async (newLat: number, newLng: number) => {
        const name = await reverseGeocode(newLat, newLng);
        onLocationChange(newLat, newLng, name);
    }, [onLocationChange]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const center: [number, number] = lat && lng ? [lat, lng] : [7.19, 100.59]; // Default: สงขลา
        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView(center, 16);

        mapInstanceRef.current = map;

        // Zoom control top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Custom draggable marker
        const icon = L.divIcon({
            className: 'location-picker-marker',
            html: `<div style="
                background: linear-gradient(135deg, #8b5cf6, #d946ef);
                width: 32px; height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 3px 12px rgba(139,92,246,0.5);
                animation: bounceIn 0.3s ease;
            "></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
        });

        const marker = L.marker(center, {
            icon,
            draggable: true,
        }).addTo(map);

        markerRef.current = marker;

        // On drag end → reverse geocode
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            handleMarkerMove(pos.lat, pos.lng);
        });

        // On map click → move marker
        map.on('click', (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            handleMarkerMove(e.latlng.lat, e.latlng.lng);
        });

        // Initial reverse geocode
        if (lat && lng) {
            handleMarkerMove(lat, lng);
        }

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update marker position when GPS changes
    useEffect(() => {
        if (lat && lng && mapInstanceRef.current && markerRef.current) {
            const latlng = L.latLng(lat, lng);
            markerRef.current.setLatLng(latlng);
            mapInstanceRef.current.setView(latlng, 16);
        }
    }, [lat, lng]);

    return (
        <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden ring-1 ring-black/10 shadow-md">
                <div
                    ref={mapRef}
                    className="w-full h-48"
                />
                {/* Update Location Button */}
                <button
                    type="button"
                    onClick={onRequestGPS}
                    disabled={gpsStatus === 'loading'}
                    className="absolute bottom-3 left-3 z-1000 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        bg-white/90 backdrop-blur-sm text-brand-dark shadow-lg border border-brand/20
                        hover:bg-brand-soft transition-all disabled:opacity-50"
                >
                    {gpsStatus === 'loading' ? (
                        <>
                            <span className="animate-spin">⏳</span> กำลังจับ GPS...
                        </>
                    ) : (
                        <>📍 อัพเดทตำแหน่ง</>
                    )}
                </button>
                {/* GPS Status Badge */}
                <div className="absolute top-3 right-3 z-1000">
                    {gpsStatus === 'success' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50/90 backdrop-blur-sm px-2 py-1 rounded-full shadow">
                            🟢 GPS OK
                        </span>
                    )}
                    {gpsStatus === 'error' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50/90 backdrop-blur-sm px-2 py-1 rounded-full shadow">
                            🔴 GPS ไม่พร้อม
                        </span>
                    )}
                </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
                📌 ลากหมุดหรือคลิกแผนที่เพื่อปรับตำแหน่ง
            </p>
        </div>
    );
}
