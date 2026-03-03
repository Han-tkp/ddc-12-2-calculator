import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Ensure table exists or create it directly in Supabase.
        // For this project, we assume there's a 'feedbacks' table.
        // Fields: id, type, organization, message, reason, contact, formulaData, status, createdAt

        const { data, error } = await supabase
            .from('feedbacks')
            .insert({
                type: body.type,
                organization: body.organization,
                reason: body.reason,
                message: body.message,
                contact: body.contact,
                formulaData: body.formulaData ? JSON.parse(body.formulaData) : null,
                status: 'NEW',
                createdAt: new Date().toISOString()
            });

        // if table doesn't exist, this might throw an error. 
        // We will catch it and return gracefully, logging it.
        if (error) {
            console.error('Supabase error inserting feedback:', error);
            // In case the table is missing entirely from initial setup:
            if (error.code === '42P01') {
                return NextResponse.json(
                    { error: 'ตารางรับข้อความยังไม่ได้ถูกสร้างในฐานข้อมูล ติดต่อผู้ดูแลระบบ' },
                    { status: 500 }
                );
            }
            throw error;
        }

        return NextResponse.json({ success: true, message: 'ส่งข้อความเรียบร้อย' }, { status: 201 });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
    }
}
