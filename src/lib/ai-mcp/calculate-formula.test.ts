/**
 * Test สำหรับ buildCalculationResponse + MCP tool calculate_formula
 *
 * จุดประสงค์: ยืนยันว่า AI/MCP layer เรียก deterministic engine (calculations.ts)
 * ตัวเดียวกับที่แอปใช้ — AI ไม่ได้คำนวณเลขเอง
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Hoisted mocks (ต้องอยู่บนสุดก่อน import ที่ใช้ mock) ─────────────────
// import ../ai/tools → ai-mcp/crud.ts → `@/lib/auth` → next-auth → `next/server`
// ที่ Node ESM resolve ไม่ได้ — mock เหมือน ai.test.ts / crud.test.ts
const { mockAuth, mockSupabase, mockGuestOwner, mockAudit } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockSupabase: { from: vi.fn() },
    mockGuestOwner: vi.fn(),
    mockAudit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mockSupabase }));
vi.mock('@/lib/guest-owner', () => ({ getGuestOwner: mockGuestOwner }));
vi.mock('@/lib/formula-audit', () => ({ recordFormulaAudit: mockAudit }));

import { buildCalculationResponse } from './fallback';
import { AI_TOOL_HANDLERS, getTool } from '../ai/tools';

describe('buildCalculationResponse', () => {
    it('คืนผลเท่ากับ calculate() จาก engine จริง (Deltacide Fogging 20 หลัง)', () => {
        const res = buildCalculationResponse({
            C: 1, S: 79, RA: 1, RA_unit: 'L', mix_type: 2, N: 20, A0: 1000, A_house: 100, chemicalName: 'Deltacide',
        });

        expect(res.result).toBeDefined();
        expect(res.result!.V_S).toBe(2000);
        expect(res.result!.V_C).toBe(25.32); // 2000 * (1/79)
        expect(res.result!.V_total).toBe(2025.32);
        expect(res.result!.V_C_1L).toBe(12.66);
        expect(res.result!.tanksCount).toBe(1);
        expect(res.text).toContain('Deltacide');
        expect(res.text).toContain('2025.32');
    });

    it('คืนผลเมื่อไม่ระบุ mix_type — ใช้ default ULV (ผสมกับ = 2)', () => {
        const res = buildCalculationResponse({
            C: 1, S: 9, RA: 75, RA_unit: 'cc', N: 20, A0: 1000, A_house: 100,
        });

        expect(res.result).toBeDefined();
        expect(res.result!.mix_type).toBe(2);
    });

    it('คืน error message เมื่อค่าสูตร <= 0', () => {
        const res = buildCalculationResponse({ C: 0, S: 9, RA: 75, RA_unit: 'cc', N: 20 });
        expect(res.text).toContain('ไม่สามารถคำนวณได้');
        expect(res.result).toBeUndefined();
    });

    it('คืน error message เมื่อ engine throw (ค่าผิดปกติ)', () => {
        const res = buildCalculationResponse({ C: 1, S: 9, RA: 75, RA_unit: 'cc', N: 20.5, A0: 1000, A_house: 100 });
        expect(res.text).toContain('ไม่สามารถคำนวณได้');
    });
});

describe('calculate_formula tool', () => {
    it('ลงทะเบียน tool ใน AI_TOOLS', () => {
        const tool = getTool('calculate_formula');
        expect(tool).toBeTruthy();
        expect(tool!.required).toContain('C');
        expect(tool!.required).toContain('S');
        expect(tool!.required).toContain('RA');
        expect(tool!.required).toContain('RA_unit');
    });

    it('handler เรียก engine จริงและคืนผลปริมาณ', async () => {
        const res = await AI_TOOL_HANDLERS.calculate_formula({
            C: 1, S: 79, RA: 1, RA_unit: 'L', mix_type: 2, N: 20, A0: 1000, A_house: 100,
        }) as any;

        expect(res.result).toBeDefined();
        expect(res.result.V_total).toBe(2025.32);
        expect(res.result.V_C).toBe(25.32);
        expect(typeof res.text).toBe('string');
    });
});
