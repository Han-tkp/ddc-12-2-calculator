import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('calculations')
            .delete()
            .eq('id', resolvedParams.id)
            .eq('userId', session.user.id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
