import { supabaseAdmin } from '@/lib/supabase';

export type FormulaAuditAction = 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE';
export type FormulaActorType = 'ADMIN' | 'GUEST';

export interface FormulaAuditEvent {
    formulaId: string;
    action: FormulaAuditAction;
    actorType: FormulaActorType;
    actorUserId?: string | null;
    guestOwnerToken?: string | null;
    actorLabel?: string | null;
    location?: string | null;
    lat?: number | null;
    lng?: number | null;
    beforeData?: unknown;
    afterData?: unknown;
}

/** Logs a CRUD event without exposing audit-table access to the browser. */
export async function recordFormulaAudit(event: FormulaAuditEvent): Promise<void> {
    const { error } = await supabaseAdmin.from('formula_audit_logs').insert({
        formulaId: event.formulaId,
        action: event.action,
        actorType: event.actorType,
        actorUserId: event.actorUserId ?? null,
        guestOwnerToken: event.guestOwnerToken ?? null,
        actorLabel: event.actorLabel ?? null,
        location: event.location ?? null,
        lat: event.lat ?? null,
        lng: event.lng ?? null,
        beforeData: event.beforeData ?? null,
        afterData: event.afterData ?? null,
    });

    if (error) {
        throw new Error(`ไม่สามารถบันทึกประวัติการจัดการสูตรได้: ${error.message}`);
    }
}
