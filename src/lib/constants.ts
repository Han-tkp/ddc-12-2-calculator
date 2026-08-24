// `ratioLabel` คืออัตราส่วนแบบอ่านง่ายจากฉลาก (เช่น '1:79') — ตั้งใจไม่ใช้ชื่อ `formula`
// เพราะฟิลด์ชื่อนั้นในสูตรจาก DB เป็น FormulaDefinition (JSONB) ถ้าใช้ชื่อซ้ำกัน สตริงนี้
// จะหลุดเข้า runFormula() แล้วอ่าน .meta.resultTemplate ของสตริงจนพัง
// (ทาง fallback ไม่ได้กรองผ่าน parseFormulaDefinition เหมือนแถวจาก DB)
export const CHEMICAL_PRESETS = [
    {
        id: 'deltacide-fogging',
        name: 'Deltacide (หมอกควัน)',
        ratioLabel: '1:79',
        C: 1,
        S: 80,
        RA: 1,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 1000,
        A_house: 100,
        description: 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร (รวม 80 ลิตร)'
    },
    {
        id: 'deltacide-ulv',
        name: 'Deltacide (ULV)',
        ratioLabel: '1:4',
        C: 1,
        S: 4,
        RA: 75,
        RA_unit: 'cc' as const,
        mix_type: 2,
        A0: 1000,
        A_house: 100,
        description: 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 4 ลิตร'
    },
    {
        id: 'submarine-fogging',
        name: 'Submarine (หมอกควัน)',
        ratioLabel: '1:249',
        C: 1,
        S: 250,
        RA: 1.25,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 1000,
        A_house: 100,
        description: 'ซับมาริน 1 ลิตร ผสมน้ำมันให้ได้ 250 ลิตร'
    },
    {
        id: 'submarine-ulv',
        name: 'Submarine (ULV)',
        ratioLabel: '1:39',
        C: 1,
        S: 40,
        RA: 2,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 10000,
        A_house: 100,
        description: 'ซับมาริน 1 ลิตร ผสมน้ำให้ได้ 40 ลิตร'
    },
    {
        id: 'other',
        name: 'อื่นๆ (กำหนดเอง)',
        ratioLabel: 'Custom',
        C: 0,
        S: 0,
        RA: 0,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 1000,
        A_house: 100,
        description: 'กำหนดอัตราส่วนผสมเอง'
    }
];
