import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

        const feedback = await db.feedback.create({
            data: {
                type: validated.type,
                organization: validated.organization,
                reason: validated.reason,
                message: validated.message || null,
                contact: validated.contact || null,
                formulaData: validated.formulaData || null,
            },
        });

        return NextResponse.json({ success: true, id: feedback.id });
    } catch (error) {
        console.error('Feedback error:', error);
        return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }
}
