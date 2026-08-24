import { describe, it, expect } from 'vitest';
import {
    thaiDayKey,
    thaiToday,
    shiftThaiDayKey,
    thaiStartOfDay,
    thaiEndOfDay,
    formatThaiDateTime,
    formatThaiDate,
} from './thai-time';

describe('thai-time — "วัน" ต้องหมายถึงวันตามเวลาไทยเสมอ', () => {
    // เคสหลักของบั๊ก: งานพ่นหมอกควันตี 2 ของวันที่ 24 ส.ค. ตามเวลาไทย
    // เวลาสากลของจุดนั้นคือ 19:00 น. ของวันที่ 23 ส.ค. — เครื่องที่เดิน UTC
    // จะนับเป็น "เมื่อวาน" ทั้งที่เจ้าหน้าที่ทำงานวันที่ 24
    const twoAmThai = new Date('2026-08-24T02:00:00+07:00');

    it('งานตี 2 เวลาไทย ต้องถูกนับเป็นวันนั้น ไม่ใช่เมื่อวาน', () => {
        expect(twoAmThai.toISOString()).toBe('2026-08-23T19:00:00.000Z');
        expect(thaiDayKey(twoAmThai)).toBe('2026-08-24');
        // ยืนยันว่านี่คือจุดที่ต่างจากการอ่านแบบ UTC ตรง ๆ
        expect(twoAmThai.toISOString().slice(0, 10)).toBe('2026-08-23');
    });

    it('งานสี่ทุ่มครึ่งเวลาไทย ยังอยู่ในวันเดียวกัน', () => {
        expect(thaiDayKey('2026-08-24T22:30:00+07:00')).toBe('2026-08-24');
    });

    it('เที่ยงคืนตรงเวลาไทย คือวันใหม่', () => {
        expect(thaiDayKey('2026-08-24T00:00:00+07:00')).toBe('2026-08-24');
        expect(thaiDayKey('2026-08-23T23:59:59+07:00')).toBe('2026-08-23');
    });

    it('ขอบเขตของวันครอบคลุมทั้ง 24 ชั่วโมงตามเวลาไทย', () => {
        const start = thaiStartOfDay('2026-08-24');
        const end = thaiEndOfDay('2026-08-24');

        expect(start.toISOString()).toBe('2026-08-23T17:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-24T16:59:59.999Z');
        expect(end.getTime() - start.getTime()).toBe(86_400_000 - 1);

        // ตี 2 ต้องอยู่ในช่วงของวันที่ 24 (เดิมหลุดออกไปอยู่วันที่ 23)
        expect(twoAmThai.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(twoAmThai.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('ขอบเขตของวันต่อกันสนิท ไม่มีช่องว่างและไม่ทับกัน', () => {
        const end23 = thaiEndOfDay('2026-08-23');
        const start24 = thaiStartOfDay('2026-08-24');
        expect(start24.getTime() - end23.getTime()).toBe(1);
    });

    it('รับ ISO string เต็มได้ โดยตีความเป็นวันตามเวลาไทย', () => {
        // 19:00 UTC = ตี 2 ของวันถัดไปตามเวลาไทย
        expect(thaiStartOfDay('2026-08-23T19:00:00.000Z').toISOString())
            .toBe('2026-08-23T17:00:00.000Z');
    });

    it('เลื่อนวันแล้วยังอยู่บนปฏิทินไทย รวมถึงข้ามเดือนและข้ามปี', () => {
        expect(shiftThaiDayKey('2026-08-24', -1)).toBe('2026-08-23');
        expect(shiftThaiDayKey('2026-09-01', -1)).toBe('2026-08-31');
        expect(shiftThaiDayKey('2026-01-01', -1)).toBe('2025-12-31');
        expect(shiftThaiDayKey('2026-02-28', 1)).toBe('2026-03-01'); // 2026 ไม่ใช่ปีอธิกสุรทิน
    });

    it('thaiToday ใช้เวลาไทยของจุดเวลาที่ให้มา', () => {
        expect(thaiToday(twoAmThai)).toBe('2026-08-24');
    });
});

describe('thai-time — การแสดงผลต้องเป็นเวลาไทย', () => {
    const twoAmThai = new Date('2026-08-24T02:00:00+07:00');

    it('แสดงเวลาตี 2 เป็น 02:00 ไม่ใช่ 19:00', () => {
        expect(formatThaiDateTime(twoAmThai)).toContain('02:00');
        expect(formatThaiDateTime(twoAmThai)).not.toContain('19:00');
    });

    it('แสดงวันที่ 24 ไม่ใช่ 23', () => {
        expect(formatThaiDate(twoAmThai)).toContain('24');
    });

    it('ค่าที่ไม่ใช่วันที่ แสดง "-" แทนที่จะเป็น Invalid Date', () => {
        expect(formatThaiDateTime('ไม่ใช่วันที่')).toBe('-');
    });
});

describe('thaiFileStamp — ชื่อไฟล์ต้องเรียงตามเวลาได้และเป็นเวลาไทย', () => {
    it('ใช้เวลาไทย ไม่ใช่เวลาสากล', async () => {
        const { thaiFileStamp } = await import('./thai-time');
        // ตี 2 ของวันที่ 24 ตามเวลาไทย = 19:00 ของวันที่ 23 ตามเวลาสากล
        expect(thaiFileStamp(new Date('2026-08-24T02:00:00+07:00'))).toBe('20260824_0200');
    });
});
