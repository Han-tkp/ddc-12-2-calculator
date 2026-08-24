// lib/calculation-filters.ts
//
// ตัวกรองของหน้า "ประวัติการคำนวณ" (/admin/logs) และของปุ่มดาวน์โหลด Excel บนหน้านั้น
// ต้องเป็นชุดเดียวกันเสมอ
//
// เดิมหน้าจอกรองด้วย ช่วงวันที่ + คำค้น + บทบาท แต่ปุ่มดาวน์โหลดส่งไปแค่ช่วงวันที่
// ไฟล์ที่ได้จึงมีข้อมูลมากกว่าที่เห็นบนจอ ผู้ใช้คาดว่า "ปุ่มดาวน์โหลด = สิ่งที่เห็นตรงหน้า"
// จึงย้ายกฎมาไว้ที่เดียวแล้วให้ทั้งสองทางเรียกใช้

import { thaiStartOfDay, thaiEndOfDay } from './thai-time';

export interface CalculationFilters {
    from?: string;
    to?: string;
    /** 'admin' = บันทึกโดยผู้ล็อกอิน, 'user' = ผู้ใช้ทั่วไป/ไม่ล็อกอิน */
    role?: string;
    /** คำค้นในชื่อสารเคมี / สถานที่ / หน่วยงาน */
    q?: string;
}

/**
 * ใส่ตัวกรองลงใน query ของตาราง calculations
 *
 * พิมพ์เป็น any ตั้งใจ ด้วยเหตุผลเดียวกับ withDimensions ในหน้าแดชบอร์ด — generic ของ
 * Supabase ที่ร้อยผ่าน helper ทำให้ TypeScript ไล่ type ลึกเกินขีดจำกัด (TS2589)
 */
export function applyCalculationFilters<Q>(query: Q, filters: CalculationFilters): Q {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q2: any = query;
    const { from, to, role, q } = filters;

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        q2 = q2.or(`chemical.ilike.${keyword},location.ilike.${keyword},agency.ilike.${keyword}`);
    }

    if (from) {
        q2 = q2.gte('createdAt', thaiStartOfDay(from).toISOString());
    }
    if (to) {
        q2 = q2.lte('createdAt', thaiEndOfDay(to).toISOString());
    }

    // ตัวกรองบทบาท: admin = บันทึกโดยผู้ล็อกอิน (userId มีค่า) หรือ agency มีคำว่า Admin
    // user = กลับด้าน: userId ว่าง และ agency ไม่ใช่ Admin
    if (role === 'admin') {
        q2 = q2.or('userId.not.is.null,agency.ilike.%Admin%');
    } else if (role === 'user') {
        q2 = q2.or(
            'and(userId.is.null,agency.not.ilike.%Admin%),' +
            'and(userId.is.null,agency.is.null)'
        );
    }

    return q2 as Q;
}
