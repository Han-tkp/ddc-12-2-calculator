import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Ensure table exists or create it directly in Supabase.
        // For this project, we assume there's a 'feedbacks' table.
        // Fields: id, type, organization, message, reason, contact, formulaData, status, createdAt

        const { data, error } = await supabaseAdmin
            .from('feedbacks')
            .insert({
                type: body.type,
                organization: body.organization,
                reason: body.reason,
                message: body.message,
                contact: body.contact,
                formulaData: body.formulaData ? (typeof body.formulaData === 'string' ? JSON.parse(body.formulaData) : body.formulaData) : null,
                status: 'NEW',
                // Note: id and createdAt will be handled by DB defaults after running fix_id_constraint.sql
            });

        if (error) {
            console.error('Supabase error inserting feedback:', error);
            if (error.code === '42P01') {
                return NextResponse.json(
                    { error: 'ยังไม่มีตารางรับข้อมูลสูตรในฐานข้อมูล กรุณาแจ้งผู้ดูแลระบบให้รันไฟล์ SQL fix' },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { error: `ไม่สามารถส่งข้อมูลได้: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'ส่งคำขอเรียบร้อยแล้ว ทีมงานจะดำเนินการตรวจสอบโดยเร็ว' }, { status: 201 });
    } catch (error: any) {
        console.error('Feedback API error:', error);
        return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }
}
