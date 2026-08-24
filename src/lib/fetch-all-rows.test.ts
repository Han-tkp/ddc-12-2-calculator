import { describe, it, expect } from 'vitest';
import { fetchAllRows, SUPABASE_PAGE_SIZE } from './fetch-all-rows';

/** จำลอง query ของ Supabase ที่มีข้อมูลอยู่ n แถว และตอบกลับได้ทีละไม่เกิน 1,000 */
function fakeTable(total: number) {
    const all = Array.from({ length: total }, (_, i) => ({ id: i }));
    let calls = 0;
    const build = () => ({
        range: async (from: number, to: number) => {
            calls += 1;
            // PostgREST ตัดที่ 1,000 แถวต่อคำขอเสมอ ต่อให้ขอมากกว่านั้น
            const end = Math.min(to, from + SUPABASE_PAGE_SIZE - 1);
            return { data: all.slice(from, end + 1), error: null };
        },
    });
    return { build, calls: () => calls };
}

describe('fetchAllRows — กันข้อมูลถูกตัดทิ้งเงียบ ๆ ที่ 1,000 แถว', () => {
    it('ข้อมูลน้อยกว่าหนึ่งหน้า ดึงครั้งเดียวจบ', async () => {
        const t = fakeTable(120);
        const { rows, truncated } = await fetchAllRows(t.build);
        expect(rows).toHaveLength(120);
        expect(truncated).toBe(false);
        expect(t.calls()).toBe(1);
    });

    it('ข้อมูล 1,000 แถวพอดี ต้องขอต่ออีกหนึ่งครั้งเพื่อยืนยันว่าหมดแล้ว', async () => {
        const t = fakeTable(1000);
        const { rows } = await fetchAllRows(t.build);
        expect(rows).toHaveLength(1000);
        expect(t.calls()).toBe(2);
    });

    it('ข้อมูล 2,500 แถว ต้องได้ครบ ไม่ใช่แค่ 1,000 (นี่คือบั๊กเดิม)', async () => {
        const t = fakeTable(2500);
        const { rows, truncated } = await fetchAllRows(t.build);
        expect(rows).toHaveLength(2500);
        expect(truncated).toBe(false);
        expect(rows[2499]).toEqual({ id: 2499 });
    });

    it('ชนเพดาน maxRows แล้วบอกว่าไม่ครบ แทนที่จะเงียบ', async () => {
        const t = fakeTable(5000);
        const { rows, truncated } = await fetchAllRows(t.build, { maxRows: 2000 });
        expect(rows).toHaveLength(2000);
        expect(truncated).toBe(true);
    });

    it('ตารางว่าง ได้ผลลัพธ์ว่าง ไม่วนไม่รู้จบ', async () => {
        const t = fakeTable(0);
        const { rows, truncated } = await fetchAllRows(t.build);
        expect(rows).toEqual([]);
        expect(truncated).toBe(false);
        expect(t.calls()).toBe(1);
    });

    it('error จากฐานข้อมูลต้องโยนออกมา ไม่กลืนเป็นผลลัพธ์ว่าง', async () => {
        const build = () => ({
            range: async () => ({ data: null, error: { message: 'connection reset' } }),
        });
        await expect(fetchAllRows(build)).rejects.toThrow('connection reset');
    });
});
