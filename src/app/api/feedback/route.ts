import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const feedbackSchema = z.object({
    type: z.string(),
    organization: z.string(),
    reason: z.string(),
    message: z.string().optional().nullable(),
    contact: z.string().optional().nullable(),
    formulaData: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = feedbackSchema.parse(body);

        const { data: feedback, error } = await supabase
            .from('feedbacks')
            .insert({
                type: validated.type,
                organization: validated.organization,
                reason: validated.reason,
                message: validated.message || null,
                contact: validated.contact || null,
                formulaData: validated.formulaData || null,
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, id: feedback.id });
    } catch (error) {
        console.error('Feedback error:', error);
        return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }
}
