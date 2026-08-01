export const CHEMICAL_PRESETS = [
    {
        id: 'deltacide-fogging',
        name: 'Deltacide (หมอกควัน)',
        formula: '1:79',
        C: 1,
        S: 79,
        RA: 1,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 1000,
        A_house: 100,
        description: 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร'
    },
    {
        id: 'deltacide-ulv',
        name: 'Deltacide (ULV)',
        formula: '1:4',
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
        formula: '1:249',
        C: 1,
        S: 249,
        RA: 1.25,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 1000,
        A_house: 100,
        description: 'ซับมาริน 1 ลิตร ผสมน้ำมัน 249 ลิตร'
    },
    {
        id: 'submarine-ulv',
        name: 'Submarine (ULV)',
        formula: '1:39',
        C: 1,
        S: 39,
        RA: 2,
        RA_unit: 'L' as const,
        mix_type: 1,
        A0: 10000,
        A_house: 100,
        description: 'ซับมาริน 1 ลิตร ผสมน้ำ 39 ลิตร'
    },
    {
        id: 'other',
        name: 'อื่นๆ (กำหนดเอง)',
        formula: 'Custom',
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
