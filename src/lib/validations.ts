// lib/validations.ts

import { z } from 'zod';

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
});

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

export type CalculationInput = z.infer<typeof calculationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;


