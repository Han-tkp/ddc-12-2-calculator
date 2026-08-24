// lib/thai-time.ts
//
// "วัน" ในระบบนี้หมายถึงวันตามเวลาประเทศไทยเสมอ
//
// เซิร์ฟเวอร์ที่รันแอป (Vercel / Docker) เดินเวลาสากล (UTC) ซึ่งช้ากว่าไทย 7 ชั่วโมง
// ถ้าปล่อยให้ startOfDay()/format() ของ date-fns ใช้เขตเวลาของเครื่อง งานที่บันทึกช่วง
// 00:00–07:00 น. ตามเวลาไทย (ซึ่งเป็นช่วงที่ออกพ่นหมอกควันจริง) จะถูกนับเป็น "เมื่อวาน"
// ทั้งหมด และเวลาที่แสดงบนตารางจะช้ากว่าความจริง 7 ชั่วโมง — เป็นความคลาดเคลื่อน
// อย่างเป็นระบบ ไม่ใช่การสุ่ม
//
// โมดูลนี้จึงเป็นจุดเดียวที่แปลงเวลา และไม่พึ่งเขตเวลาของเครื่องเลย
//
// ประเทศไทยใช้ UTC+07:00 คงที่มาตั้งแต่ พ.ศ. 2463 และไม่มี daylight saving
// การบวกลบด้วยค่าคงที่จึงแม่นยำ 100% ไม่ต้องพึ่งฐานข้อมูลเขตเวลาตอนคำนวณ

export const THAI_TZ = 'Asia/Bangkok';

/** ระยะห่างจากเวลาสากลของไทย (มิลลิวินาที) */
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * คีย์ของวัน (yyyy-MM-dd) ตามเวลาไทย — ใช้จับกลุ่มข้อมูลรายวันให้ตรงกับวันที่
 * เจ้าหน้าที่ออกปฏิบัติงานจริง
 */
export function thaiDayKey(value: Date | string | number): string {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(d.getTime() + THAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** คีย์ของวันนี้ตามเวลาไทย */
export function thaiToday(now: Date = new Date()): string {
    return thaiDayKey(now);
}

/** เลื่อนคีย์วันไปข้างหลัง n วัน (ยังคงอยู่บนปฏิทินไทย) */
export function shiftThaiDayKey(dayKey: string, days: number): string {
    return thaiDayKey(thaiStartOfDay(dayKey).getTime() + days * 86_400_000);
}

/**
 * รับได้ทั้ง 'yyyy-MM-dd' และ ISO string เต็ม — ตัดเอาเฉพาะส่วนวัน
 * (ถ้าเป็น ISO เต็มจะตีความเป็นจุดเวลาแล้วหาว่าตรงกับวันไหนตามเวลาไทย)
 */
export function toThaiDayKey(value: string): string {
    return DAY_KEY.test(value) ? value : thaiDayKey(value);
}

/** จุดเวลาของ 00:00:00.000 น. ตามเวลาไทย ของวันที่ระบุ */
export function thaiStartOfDay(value: string | Date): Date {
    const dayKey = value instanceof Date ? thaiDayKey(value) : toThaiDayKey(value);
    return new Date(`${dayKey}T00:00:00.000+07:00`);
}

/** จุดเวลาของ 23:59:59.999 น. ตามเวลาไทย ของวันที่ระบุ */
export function thaiEndOfDay(value: string | Date): Date {
    const dayKey = value instanceof Date ? thaiDayKey(value) : toThaiDayKey(value);
    return new Date(`${dayKey}T23:59:59.999+07:00`);
}

/**
 * แสดงวัน-เวลาเป็นภาษาไทยและเขตเวลาไทย
 *
 * หมายเหตุ: การระบุ locale 'th-TH' อย่างเดียว **ไม่ได้** เปลี่ยนเขตเวลา ต้องระบุ
 * timeZone ด้วยเสมอ ซึ่งเป็นสาเหตุที่เวลาบนหน้าจอเคยช้ากว่าความจริง 7 ชั่วโมง
 */
export function formatThai(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions,
): string {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('th-TH', { timeZone: THAI_TZ, ...options }).format(d);
}

/** เช่น "24 ส.ค. 08:30" — ใช้ในตารางประวัติ */
export function formatThaiDateTime(value: Date | string | number): string {
    return formatThai(value, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

/** เช่น "24 ส.ค. 69 08:30" (พ.ศ. ย่อ) */
export function formatThaiDateTimeShortYear(value: Date | string | number): string {
    return formatThai(value, {
        day: 'numeric', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

/** เช่น "24 ส.ค. 2569" */
export function formatThaiDate(value: Date | string | number): string {
    return formatThai(value, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** เช่น "24 ส.ค." — ใช้บนแกนของกราฟ */
export function formatThaiDayMonth(value: Date | string | number): string {
    return formatThai(value, { day: 'numeric', month: 'short' });
}

/** เช่น "24/08/2569 08:30" — รูปแบบที่ใช้ในไฟล์ Excel */
export function formatThaiSlashDateTime(value: Date | string | number): string {
    return formatThai(value, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

/** เช่น "24/08/2569" */
export function formatThaiSlashDate(value: Date | string | number): string {
    return formatThai(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * ป้ายเวลาสำหรับตั้งชื่อไฟล์ รูปแบบ yyyyMMdd_HHmm ตามเวลาไทย (ปี ค.ศ. เพื่อให้เรียงไฟล์ได้)
 */
export function thaiFileStamp(value: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: THAI_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(value);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}${get('month')}${get('day')}_${get('hour')}${get('minute')}`;
}
