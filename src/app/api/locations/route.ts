import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/locations — Shared Location Registry
// Returns unique locations from all calculations (for Desktop App dropdown)
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';

        // Note: Using `as any` because prisma generate may not have run yet
        // but the lat/lng columns exist in DB from prisma db push
        const locations = await (db.calculation as any).findMany({
            where: {
                location: {
                    not: null,
                    ...(search ? { contains: search, mode: 'insensitive' } : {}),
                },
            },
            select: {
                location: true,
                lat: true,
                lng: true,
                createdAt: true,
            },
            distinct: ['location'],
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Count calculations per location
        const locationCounts = await db.calculation.groupBy({
            by: ['location'],
            where: {
                location: { not: null },
            },
            _count: { location: true },
            orderBy: { _count: { location: 'desc' } },
        });

        const countMap = new Map(
            locationCounts.map((item: any) => [item.location, item._count.location])
        );

        const result = (locations as any[])
            .filter((loc: any) => loc.location)
            .map((loc: any) => ({
                name: loc.location,
                lat: loc.lat,
                lng: loc.lng,
                usageCount: countMap.get(loc.location) || 0,
                lastUsed: loc.createdAt.toISOString(),
            }));

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
