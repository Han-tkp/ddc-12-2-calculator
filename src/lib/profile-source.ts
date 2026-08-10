/**
 * Infers how a `label_profiles` row was added, for display in management/history
 * tables. There is no dedicated "source" column — this reads existing signals
 * (isDefault, guestOwnerToken, description text) instead of adding one, since a
 * schema migration wasn't wanted for this. Best-effort, not a tracked fact.
 */
export type ProfileSource =
    | 'default'
    | 'admin'
    | 'guest'
    | 'file-import';

export interface ProfileSourceInfo {
    source: ProfileSource;
    label: string;
}

interface ProfileSourceFields {
    isDefault?: boolean | null;
    description?: string | null;
    guestOwnerToken?: string | null;
    createdById?: string | null;
}

const FILE_IMPORT_HINTS = ['นำเข้าจากไฟล์', 'แนบไฟล์ฉลาก', 'วิเคราะห์ฉลาก'];

export function inferProfileSource(profile: ProfileSourceFields): ProfileSourceInfo {
    if (profile.isDefault) {
        return { source: 'default', label: 'ค่าเริ่มต้นระบบ' };
    }

    const isFileImport = FILE_IMPORT_HINTS.some((hint) => profile.description?.includes(hint));
    if (isFileImport) {
        return { source: 'file-import', label: 'นำเข้าจากไฟล์/Excel' };
    }

    // guestOwnerToken is stripped from the public /api/profiles response, so this
    // branch only resolves on the admin page (which selects the raw row).
    if (profile.guestOwnerToken) {
        return { source: 'guest', label: 'ผู้ใช้ทั่วไปเพิ่ม' };
    }

    if (profile.createdById) {
        return { source: 'admin', label: 'ผู้ดูแลระบบเพิ่ม' };
    }

    return { source: 'admin', label: 'เพิ่มด้วยตนเอง' };
}
