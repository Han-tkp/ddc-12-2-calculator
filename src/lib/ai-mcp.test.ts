import { describe, it, expect } from 'vitest';
import { buildFormulaDraftFromFile, buildFormulaDraftFromText, classifyIntent } from './ai-mcp';

describe('classifyIntent', () => {
    describe('compare_chemicals takes priority over query_chemical', () => {
        it('classifies "เปรียบเทียบ Deltacide กับ Submarine" as compare_chemicals', () => {
            expect(classifyIntent('เปรียบเทียบ Deltacide กับ Submarine')).toBe('compare_chemicals');
        });

        it('classifies "เทียบ Deltacide กับ Fendona" as compare_chemicals', () => {
            expect(classifyIntent('เทียบ Deltacide กับ Fendona')).toBe('compare_chemicals');
        });

        it('classifies "Deltacide vs Submarine" as compare_chemicals', () => {
            expect(classifyIntent('Deltacide vs Submarine')).toBe('compare_chemicals');
        });
    });

    describe('query_chemical', () => {
        it('classifies a bare brand name as query_chemical', () => {
            expect(classifyIntent('Deltacide')).toBe('query_chemical');
        });

        it('classifies "เดลตาไซด์คืออะไร" as query_chemical', () => {
            expect(classifyIntent('เดลตาไซด์คืออะไร')).toBe('query_chemical');
        });
    });

    describe('query_history', () => {
        it('classifies "ประวัติการใช้งานย้อนหลัง" as query_history', () => {
            expect(classifyIntent('ประวัติการใช้งานย้อนหลัง')).toBe('query_history');
        });
    });

    describe('create_formula', () => {
        it('classifies "สร้างสูตร ULV" as create_formula', () => {
            expect(classifyIntent('ช่วยสร้างสูตร ULV เดลตาไซด์')).toBe('create_formula');
        });
    });

    describe('general_chat', () => {
        it('classifies greeting as general_chat', () => {
            expect(classifyIntent('สวัสดีครับ')).toBe('general_chat');
        });
    });
});

describe('formula drafts from uploads', () => {
    it('extracts a formula from structured CSV-like data', () => {
        const result = buildFormulaDraftFromFile({
            fileName: 'chemical.csv',
            headers: ['name', 'C', 'S', 'RA', 'RA_unit'],
            rows: [['New Chemical', 1, 9, 50, 'cc']],
        });
        expect(result?.formula).toMatchObject({ name: 'New Chemical', C: 1, S: 9, RA: 50, RA_unit: 'cc' });
    });

    it('extracts a formula from label-style text', () => {
        const result = buildFormulaDraftFromText('ชื่อสารเคมี: New Chemical\nอัตราส่วน: 1:79\nRA: 1 ลิตร\nพื้นที่มาตรฐาน: 1,000', 'label.txt');
        expect(result?.formula).toMatchObject({ name: 'New Chemical', C: 1, S: 79, RA: 1, RA_unit: 'L', A0: 1000 });
    });
});
