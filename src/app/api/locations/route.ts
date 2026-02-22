import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/locations — Shared Location Registry
// Returns unique locations from all calculations (for Desktop App dropdown)
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';

        // Fetch raw data from Supabase
        // equivalent to: findMany with distinct and groupBy
        // Since Supabase JS client doesn't support distinct/groupBy easily without RPC,
        // we'll fetch recent records and aggregate in JS.
        const { data: rawData, error } = await supabase
            .from('calculations')
            .select('location, lat, lng, createdAt')
            .not('location', 'is', null)
            .order('createdAt', { ascending: false })
            .limit(1000); // Limit to recent 1000 records for performance

        if (error) throw error;

        // Process data:
        // 1. Filter by search params
        // 2. Aggregate counts
        // 3. Keep unique locations (most recent one)

        const locationMap = new Map<string, any>();
        const countMap = new Map<string, number>();

        const filteredData = (rawData || []).filter((item: any) => {
            if (!item.location) return false;
            if (search && !item.location.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        filteredData.forEach((item: any) => {
            const locName = item.location;

            // Count
            countMap.set(locName, (countMap.get(locName) || 0) + 1);

            // Store first occurrence (most recent due to sort)
            if (!locationMap.has(locName)) {
                locationMap.set(locName, item);
            }
        });

        // Convert Map to Array
        const result = Array.from(locationMap.values()).map((loc: any) => ({
            name: loc.location,
            lat: loc.lat,
            lng: loc.lng,
            usageCount: countMap.get(loc.location) || 0,
            lastUsed: loc.createdAt,
        }));

        // Sort by usage count descending? Or recently used?
        // Original code: distinct locations sorted by createdAt desc (which we preserved via loop order)
        // But count was also returned.
        // Let's keep order of discovery (recent first)

        return NextResponse.json({
            success: true,
            data: result,
            total: result.length,
        });
    } catch (error) {
        console.error('Locations API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch locations' },
            { status: 500 }
        );
    }
}
