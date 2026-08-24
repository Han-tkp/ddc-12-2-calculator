// lib/validations.ts

import { z } from 'zod';
import { normalizeCSForCalc } from './cs-units';

export const calculationSchema = z.object({
    C: z.number().positive('สัดส่วนสารออกฤทธิ์ต้องเป็นจำนวนบวก'),
    S: z.number().positive('สัดส่วนตัวทำละลายต้องเป็นจำนวนบวก'),
    RA: z.number().positive('อัตราการพ่นต้องเป็นจำนวนบวก'),
    RA_unit: z.enum(['L', 'cc'], {
        message: 'หน่วยต้องเป็น L หรือ cc เท่านั้น',
    }),
    mix_type: z.number().int().min(1).max(2).default(1),
    A0: z.number().positive('พื้นที่มาตรฐานต้องเป็นจำนวนบวก'),
    A_house: z.number().positive('พื้นที่ต่อหลังบ้านต้องเป็นจำนวนบวก'),
    N: z.number().int('จำนวนหลังบ้านต้องเป็นจำนวนเต็ม').positive('จำนวนหลังบ้านต้องมากกว่า 0'),
    targetVolume: z.number().positive('ปริมาณน้ำยาพ่นต้องมากกว่า 0').optional().default(1),
    location: z.string().optional(),
    agency: z.string().optional(),
    chemical: z.string().optional(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
}).superRefine((data, ctx) => {
    // ด่านเดียวกับใน calculate() (calculations.ts) — ต้องอยู่ที่ schema ด้วย ไม่งั้น calculate()
    // จะโยน Error ธรรมดาที่ไม่มี .issues แล้วหลุด branch 400 ใน api/calculations กลายเป็น 500
    // ผู้ใช้จึงเห็นแค่ "เกิดข้อผิดพลาด" โดยไม่รู้ว่าผิดช่องไหน
    //
    // C/S ที่มาถึงตรงนี้ผ่าน normalizeCSForCalc มาแล้ว จึงเทียบกันตรง ๆ ได้
    if (data.mix_type !== 2 && data.S <= data.C) {
        ctx.addIssue({
            code: 'custom',
            path: ['S'],
            message: 'แบบผสมให้ได้: ปริมาณรวมต้องมากกว่าปริมาณสารเคมี',
        });
    }
});

export const profileSchema = z.object({
    name: z.string().min(1, 'กรุณาระบุชื่อโปรไฟล์').max(100, 'ชื่อยาวเกินไป'),
    description: z.string().max(500, 'คำอธิบายยาวเกินไป').optional().nullable(),
    C: z.number().positive('สัดส่วนสารออกฤทธิ์ต้องเป็นจำนวนบวก'),
    S: z.number().positive('สัดส่วนตัวทำละลายต้องเป็นจำนวนบวก'),
    RA: z.number().positive('อัตราการพ่นต้องเป็นจำนวนบวก'),
    RA_unit: z.enum(['L', 'cc']),
    mix_type: z.number().int().min(1).max(2).default(1),
    A0: z.number().positive('พื้นที่มาตรฐานต้องเป็นจำนวนบวก'),
    isActive: z.boolean().default(true),
    // The real units of the stored C and S — these ARE read at calculation time
    // (normalizeCSForCalc in src/lib/cs-units.ts). C/S hold the numbers as typed off
    // the label; null on BOTH means a unit-less ratio ("ส่วน"), which is how legacy
    // rows that were reduced before this model existed are represented.
    C_unit: z.enum(['L', 'cc']).optional().nullable(),
    S_unit: z.enum(['L', 'cc']).optional().nullable(),
    // Optional per-field explanation shown alongside the result (e.g. why A0
    // defaults to what it does for this formula). Additive only — see ResultsDisplay.
    resultHelp: z.record(z.string(), z.string()).optional().nullable(),
});

/**
 * กฎความสอดคล้องของคู่ C/S ที่ใช้ร่วมกันทุก schema ของสูตร — แยกออกมาเพราะ .extend()
 * ใช้กับ schema ที่ refine แล้วไม่ได้ ต้อง refine ทีหลังสุดของแต่ละตัว
 */
const refineCSConsistency = (data: {
    C: number; S: number; mix_type: number;
    C_unit?: 'L' | 'cc' | null; S_unit?: 'L' | 'cc' | null;
}, ctx: z.RefinementCtx) => {
    // หน่วยต้องมาเป็นคู่เสมอ — มีข้างเดียวแปลว่าอีกข้างจะถูกเดาเป็นค่า default แล้วสัดส่วน
    // จะเพี้ยนไปตามตัวคูณ 1000 ระหว่างหน่วย ปิดที่ชั้น API ด้วยเพื่อกัน bundle เก่าที่ค้างอยู่
    const hasC = data.C_unit != null;
    const hasS = data.S_unit != null;
    if (hasC !== hasS) {
        ctx.addIssue({
            code: 'custom',
            path: [hasC ? 'S_unit' : 'C_unit'],
            message: 'ต้องระบุหน่วยของสารเคมีและตัวทำละลายให้ครบทั้งคู่ หรือไม่ระบุทั้งคู่',
        });
        return;
    }

    // โหมด "ผสมให้ได้" S คือยอดรวม จึงต้องมากกว่าปริมาณสารเคมีหลังแปลงหน่วยแล้ว
    // ให้ตรงกับ guard ใน calculate() เพื่อให้สูตรผิดถูกปัดตกตอนบันทึก ไม่ใช่ตอนออกหน้างาน
    if (data.mix_type !== 2) {
        const { C, S } = normalizeCSForCalc(data.C, data.C_unit, data.S, data.S_unit);
        if (S <= C) {
            ctx.addIssue({
                code: 'custom',
                path: ['S'],
                message: 'แบบผสมให้ได้: ปริมาณรวมต้องมากกว่าปริมาณสารเคมี',
            });
        }
    }
};

// profileSchema ดิบไว้สำหรับ .extend() เท่านั้น — payload จริงทุกเส้นทางผ่าน profileMutationSchema
// (src/app/api/profiles/route.ts:41 และ src/app/api/profiles/[id]/route.ts:50) ซึ่ง refine แล้ว
export const profileMutationSchema = profileSchema.extend({
    actorLabel: z.string().trim().min(1, 'กรุณาระบุชื่อผู้ทำรายการ').max(100, 'ชื่อผู้ทำรายการยาวเกินไป').optional(),
    location: z.string().trim().max(200, 'ชื่อสถานที่ยาวเกินไป').optional(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
}).superRefine(refineCSConsistency);

export const loginSchema = z.object({
    email: z.string({ message: 'กรุณาระบุอีเมล' }).min(1, 'กรุณาระบุอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string({ message: 'กรุณาระบุรหัสผ่าน' }).min(1, 'กรุณาระบุรหัสผ่าน'),
});

export const registerSchema = z.object({
    name: z.string({ message: 'กรุณาระบุชื่อ' }).min(1, 'กรุณาระบุชื่อ').max(100, 'ชื่อยาวเกินไป'),
    email: z.string({ message: 'กรุณาระบุอีเมล' }).min(1, 'กรุณาระบุอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string({ message: 'กรุณาระบุรหัสผ่าน' }).min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    confirmPassword: z.string({ message: 'กรุณายืนยันรหัสผ่าน' }).min(1, 'กรุณายืนยันรหัสผ่าน'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
});

/**
 * `/q/<id>` redirects to whatever `targetUrl` holds, which makes this table a redirector.
 * Restricting the scheme to http/https is what stops a stored `javascript:` or `data:`
 * URL from turning that redirect into a script-execution or phishing vector — so keep
 * this check on the write path, not just in the UI.
 */
const httpUrl = z
    .string({ message: 'กรุณาระบุลิงก์' })
    .trim()
    .min(1, 'กรุณาระบุลิงก์')
    .max(2048, 'ลิงก์ยาวเกินไป')
    .refine((value) => {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }, 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น');

export const qrCodeCreateSchema = z.object({
    label: z.string({ message: 'กรุณาระบุชื่อเรียก' }).trim().min(1, 'กรุณาระบุชื่อเรียก').max(120, 'ชื่อเรียกยาวเกินไป'),
    targetUrl: httpUrl,
});

export const qrCodeUpdateSchema = z.object({
    label: z.string().trim().min(1, 'กรุณาระบุชื่อเรียก').max(120, 'ชื่อเรียกยาวเกินไป').optional(),
    targetUrl: httpUrl.optional(),
}).refine((data) => data.label !== undefined || data.targetUrl !== undefined, {
    message: 'ไม่มีข้อมูลที่ต้องการแก้ไข',
});

export type QrCodeCreateInput = z.infer<typeof qrCodeCreateSchema>;
export type QrCodeUpdateInput = z.infer<typeof qrCodeUpdateSchema>;

export type CalculationInput = z.infer<typeof calculationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileMutationInput = z.infer<typeof profileMutationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
