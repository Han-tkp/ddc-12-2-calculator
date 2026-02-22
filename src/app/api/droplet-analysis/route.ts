import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// POST - รับข้อมูลจาก Desktop App
export async function POST(req: NextRequest) {
    try {
        // Validate API Key
        const apiKey = req.headers.get('x-api-key');
        const expectedKey = process.env.API_SECRET_KEY;

        if (!apiKey || apiKey !== expectedKey) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid API Key' },
                { status: 401 }
            );
        }

        const body = await req.json();

        // Validate required fields
        if (body.vmd === undefined || body.span === undefined || body.dropletCount === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: vmd, span, dropletCount' },
                { status: 400 }
            );
        }

        const { data: analysis, error } = await supabase
            .from('droplet_analyses')
            .insert({
                machineId: body.machineId || null,
                machineName: body.machineName || null,
                organization: body.organization || null,
                temperature: body.temperature ? parseFloat(body.temperature) : null,
                flowRate: body.flowRate ? parseFloat(body.flowRate) : null,
                vmd: parseFloat(body.vmd),
                span: parseFloat(body.span),
                d10: body.d10 ? parseFloat(body.d10) : null,
                d90: body.d90 ? parseFloat(body.d90) : null,
                dropletCount: parseInt(body.dropletCount),
                averageDiameter: body.averageDiameter ? parseFloat(body.averageDiameter) : null,
                magnification: body.magnification || null,
                passStandard: body.passStandard ?? (parseFloat(body.vmd) >= 10 && parseFloat(body.vmd) <= 30),
                chemical: body.chemical || null,
                rawData: body.rawData ? (typeof body.rawData === 'string' ? body.rawData : JSON.stringify(body.rawData)) : null,
                notes: body.notes || null,
                analysisDate: body.analysisDate ? new Date(body.analysisDate).toISOString() : new Date().toISOString(),
                createdAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            id: analysis.id,
            message: 'Analysis saved successfully',
        }, { status: 201 });

    } catch (error) {
        console.error('❌ Droplet Analysis API Error:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - ดึงข้อมูลสำหรับ Admin Dashboard
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const { data: analyses, count: total, error } = await supabase
            .from('droplet_analyses')
            .select('*', { count: 'exact' })
            .order('createdAt', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) throw error;

        // Use total (count) from Supabase response
        // analyses is already the paginated data

        return NextResponse.json({
            data: analyses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        console.error('❌ GET Droplet Analysis Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
