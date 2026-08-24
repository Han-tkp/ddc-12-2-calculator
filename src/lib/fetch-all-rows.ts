// lib/fetch-all-rows.ts
//
// PostgREST (เบื้องหลัง Supabase) ตอบกลับ **สูงสุด 1,000 แถวต่อคำขอ** เป็นค่าตั้งต้น
// ถ้าผลลัพธ์เกินกว่านั้นจะถูกตัดทิ้งเงียบ ๆ — ไม่มี error ไม่มีคำเตือน ยอดรวมบนแดชบอร์ด
// และไฟล์ Excel จะ "นิ่ง" อยู่ที่ค่าหนึ่งแล้วไม่โตอีก โดยไม่มีอะไรบอกว่าข้อมูลขาด
//
// ทุกที่ที่ต้องการ "ข้อมูลทั้งช่วง" (ไม่ใช่ตารางแบบแบ่งหน้า) ให้ดึงผ่านฟังก์ชันนี้

/** จำนวนแถวสูงสุดต่อคำขอที่ PostgREST ยอมให้ */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * เพดานกันหน่วยความจำ — ถ้าช่วงวันที่กว้างมากจนเกินนี้ จะหยุดดึงและรายงานว่าไม่ครบ
 * ผ่าน `truncated` เพื่อให้หน้าจอขึ้นคำเตือนได้ ไม่ใช่เงียบแบบเดิม
 */
export const DEFAULT_MAX_ROWS = 50_000;

export interface FetchAllRowsResult<T> {
    rows: T[];
    /** true = ชนเพดาน maxRows ข้อมูลที่ได้ยังไม่ครบทั้งช่วง */
    truncated: boolean;
}

/**
 * ดึงข้อมูลทีละหน้า (page) จนหมด แล้วรวมเป็นชุดเดียว
 *
 * ต้องส่ง `buildQuery` เป็นฟังก์ชันสร้าง query ใหม่ทุกครั้ง เพราะ query builder ของ
 * Supabase ใช้ซ้ำหลังจากรันไปแล้วไม่ได้
 *
 * พิมพ์เป็น any ตั้งใจ: การร้อย generic ของ Supabase ผ่าน helper ทำให้ TypeScript
 * ไล่ type ลึกเกินขีดจำกัด (TS2589) — รูปร่างข้อมูลถูกตรวจที่จุดเรียกใช้แทน
 */
export async function fetchAllRows<T = unknown>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildQuery: () => any,
    options: { pageSize?: number; maxRows?: number } = {},
): Promise<FetchAllRowsResult<T>> {
    const pageSize = Math.min(options.pageSize ?? SUPABASE_PAGE_SIZE, SUPABASE_PAGE_SIZE);
    const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

    const rows: T[] = [];

    while (rows.length < maxRows) {
        const from = rows.length;
        const to = Math.min(from + pageSize, maxRows) - 1;
        const requested = to - from + 1;

        const { data, error } = await buildQuery().range(from, to);
        if (error) {
            throw new Error(`ดึงข้อมูลไม่สำเร็จ: ${error.message}`);
        }

        const batch = (data || []) as T[];
        rows.push(...batch);

        // ได้น้อยกว่าที่ขอ แปลว่าหมดแล้ว
        if (batch.length < requested) break;
    }

    return { rows, truncated: rows.length >= maxRows };
}
