/**
 * Tracking calculation helper — POST /api/calculations แบบ best-effort
 *
 * ใช้ตอนผู้ใช้สร้างสูตร Custom / AI / Public formula แล้วอยากบันทึกเป็น
 * "ประวัติการคำนวณ" (calculations table) โดยไม่ให้ล้มแล้วกระทบ flow หลัก
 *
 * ถ้า fail ให้ log ไว้ แต่ไม่ throw — caller รับ error ใน console เท่านั้น
 */
export interface TrackingCalculationInput {
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
    A_house: number;
    N: number;
    chemical: string;
    location: string;
    agency: string;
    lat?: number | null;
    lng?: number | null;
}

export async function recordTrackingCalculation(input: TrackingCalculationInput): Promise<void> {
    try {
        const res = await fetch('/api/calculations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        if (!res.ok) {
            const detail = await res.json().catch(() => ({}));
            console.error('บันทึก tracking calculation ไม่สำเร็จ:', detail);
        }
    } catch (err) {
        console.error('บันทึก tracking calculation ไม่สำเร็จ:', err);
    }
}