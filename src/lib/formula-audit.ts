import { supabaseAdmin } from '@/lib/supabase';
import type { DeviceInfo } from '@/lib/device-info';

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
    /** Device provenance, parsed server-side from the User-Agent (see src/lib/device-info.ts). */
    device?: DeviceInfo | null;
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
        deviceOs: event.device?.os ?? null,
        deviceBrowser: event.device?.browser ?? null,
        deviceModel: event.device?.deviceModel ?? null,
    });

    if (error) {
        throw new Error(`ไม่สามารถบันทึกประวัติการจัดการสูตรได้: ${error.message}`);
    }
}
