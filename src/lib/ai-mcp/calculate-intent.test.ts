import { describe, it, expect } from 'vitest';
import { classifyIntent, extractCalculationParams, buildCalculationResponse } from './fallback';

describe('classifyIntent recognises calculation requests', () => {
    it.each([
        'คำนวณซับมาริน ULV 20 หลัง',
        'ต้องผสมเท่าไร',
        'ใช้กี่ถัง',
        'calculate deltacide for 30 houses',
    ])('%s → calculate', (text) => {
        expect(classifyIntent(text)).toBe('calculate');
    });

    it('wins over create_formula when the sentence contains both verbs', () => {
        // "คำนวณสูตรผสม..." must compute, not offer to author a new profile.
        expect(classifyIntent('คำนวณสูตรผสม ULV 20 หลัง')).toBe('calculate');
    });

    it('leaves unrelated messages alone', () => {
        expect(classifyIntent('เดลตาไซด์คืออะไร')).toBe('query_chemical');
        expect(classifyIntent('สวัสดี')).toBe('general_chat');
    });
});

describe('extractCalculationParams', () => {
    const sentence =
        'คำนวณซับมาริน ULV อัตราส่วน 500 มล. ต่อ 12.5 ลิตร ผสมกับ พ่น 1.25 ลิตรต่อ 10000 ตร.ม. พ่น 20 หลัง พื้นที่รวม 2000 ตร.ม.';

    it('normalises the mixed-unit ratio to 1:25, not 500:12.5', () => {
        const params = extractCalculationParams(sentence);
        expect(params.C).toBe(1);
        expect(params.S).toBe(25);
    });

    it('reads spray rate, reference area, house count and total area', () => {
        const params = extractCalculationParams(sentence);
        expect(params.RA).toBe(1250);     // 1.25 L → cc
        expect(params.RA_unit).toBe('cc');
        expect(params.A0).toBe(10000);
        expect(params.N).toBe(20);
        expect(params.A_total).toBe(2000);
        expect(params.mix_type).toBe(2);  // ผสมกับ
    });

    it('does not invent A_house — it is left for the resolver to derive', () => {
        expect(extractCalculationParams(sentence).A_house).toBeUndefined();
    });

    it('reads house dimensions when given instead of a total', () => {
        const params = extractCalculationParams('คำนวณ 1:25 พ่น 50 cc ต่อ 100 ตร.ม. 10 หลัง บ้านกว้าง 8 ยาว 12');
        expect(params.houseWidth).toBe(8);
        expect(params.houseLength).toBe(12);
    });

    it('reads an explicitly stated per-house area', () => {
        const params = extractCalculationParams('คำนวณ 1:25 พ่น 50 cc ต่อ 100 ตร.ม. 10 หลัง บ้านละ 150 ตร.ม.');
        expect(params.A_house).toBe(150);
    });
});

describe('end-to-end: sentence → deterministic engine', () => {
    it('derives A_house from the total area and reports how', () => {
        const params = extractCalculationParams(
            'คำนวณซับมาริน ULV อัตราส่วน 500 มล. ต่อ 12.5 ลิตร ผสมกับ พ่น 1.25 ลิตรต่อ 10000 ตร.ม. พ่น 20 หลัง พื้นที่รวม 2000 ตร.ม.'
        );
        const response = buildCalculationResponse(params);

        // 2,000 m² at 1.25 L/10,000 m² → 250 mL carrier; concentrate added at 1:25 → 10 mL.
        expect(response.result?.V_S).toBeCloseTo(250, 6);
        expect(response.result?.V_C).toBeCloseTo(10, 6);
        expect(response.result?.V_total).toBeCloseTo(260, 6);

        expect(response.text).toContain('ย้อนหาจากพื้นที่รวม');
        expect(response.text).toContain('÷ 20 หลัง');
    });

    it('flags the fallback area as an assumption rather than presenting it as measured', () => {
        const params = extractCalculationParams('คำนวณ 1:25 พ่น 1250 cc ต่อ 10000 ตร.ม. 20 หลัง');
        const response = buildCalculationResponse(params);
        expect(response.text).toContain('⚠️');
        expect(response.text).toContain('ค่าเริ่มต้น');
    });
});

describe('A0 omission is surfaced, never silently defaulted', () => {
    it('warns loudly when the reference area was not supplied', () => {
        // A0 divides into the dose: defaulting 10,000 → 1,000 is a tenfold overdose.
        const res = buildCalculationResponse({ C: 1, S: 25, RA: 1250, RA_unit: 'cc', N: 20, A_total: 2000, mix_type: 2 });
        expect(res.text).toContain('ไม่ได้ระบุพื้นที่อ้างอิง');
        expect(res.text).toContain('ผิดเป็นเท่าตัว');
    });

    it('confirms with ✓ when A0 was supplied', () => {
        const res = buildCalculationResponse({ C: 1, S: 25, RA: 1250, RA_unit: 'cc', N: 20, A_total: 2000, A0: 10000, mix_type: 2 });
        expect(res.text).not.toContain('ไม่ได้ระบุพื้นที่อ้างอิง');
        expect(res.text).toContain('อัตราพ่น: 1250 มล. ต่อ 10,000 ตร.ม. ✓');
        // The engine numbers must be the correct ones, not the 10× default.
        expect(res.result?.V_total).toBeCloseTo(260, 6);
    });
});
