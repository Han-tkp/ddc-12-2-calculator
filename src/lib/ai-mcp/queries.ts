/**
 * Supabase data builders — query chemical profiles และสร้างคำตอบจากข้อมูลจริง
 */
import { supabaseAdmin } from '../supabase';
import type { AIFormulaResult, ExtractedFormulaParams } from './types';

/** Internal: query chemical profiles — used by all 3 builders below + MCP tools (ai/tools.ts) */
export async function queryChemicalProfiles(args: { search?: string; limit?: number | string }) {
    const search = args.search ?? '';
    const limit = Math.min(Number(args.limit ?? 10), 50);
    const { data, error } = await supabaseAdmin
        .from('label_profiles')
        .select('*')
        .eq('isActive', true)
        .ilike('name', `%${search}%`)
        .order('name', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return { profiles: data ?? [] };
}

/** Query calculation history — exposed for MCP tool layer (ai/tools.ts) */
export async function queryCalculations(args: { chemical?: string; limit?: number | string }) {
    const limit = Math.min(Number(args.limit ?? 10), 50);
    const chemical = args.chemical ?? '';
    let query = supabaseAdmin
        .from('calculations')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(limit);

    if (chemical) {
        query = query.ilike('chemical', `%${chemical}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { calculations: data ?? [] };
}

interface ProfileRow {
    name: string; description?: string; C: number; S: number;
    RA: number; RA_unit: string; mix_type: number; A0: number;
}

/** Fetch chemical profiles from Supabase and build formula response */
export async function buildFormulaFromSupabase(searchTerm: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const profiles = await queryChemicalProfiles({ search: searchTerm });
    const list = profiles.profiles as ProfileRow[];

    if (list.length === 0) {
        return {
            text: `⚠️ ไม่พบข้อมูล "${searchTerm}" ในฐานข้อมูล label_profiles กรุณาตรวจสอบชื่อสารเคมีหรือลองคำค้นหาอื่น`,
        };
    }

    const profile = list[0];
    const mixLabel = profile.mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';

    return {
        text: `✅ ค้นพบข้อมูล "${profile.name}" ในฐานข้อมูล Supabase แล้ว

📋 **รายละเอียด:**
• อัตราส่วนผสม: ${profile.C} : ${profile.S} (${mixLabel})
• อัตราการพ่น (RA): ${profile.RA} ${profile.RA_unit} / ${profile.A0.toLocaleString()} ตร.ม.

📝 ${profile.description || ''}

🔬 **ข้อควรปฏิบัติ:**
• สวมอุปกรณ์ป้องกัน PPE ทุกครั้ง (หน้ากาก N95, ถุงมือยาง, แว่นตานิรภัย)
• ตรวจสอบทิศทางลมก่อนฉีดพ่นทุกครั้ง
• หลีกเลี่ยงการพ่นในช่วงกลางวันที่มีแดดจัด`,
        formula: {
            name: profile.name,
            description: profile.description || '',
            C: profile.C,
            S: profile.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit as 'L' | 'cc',
            mix_type: profile.mix_type,
            A0: profile.A0,
        },
    };
}

/** Generate a new formula recommendation based on best-match from Supabase data */
export async function buildNewFormulaRecommendation(userQuery: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const lower = userQuery.toLowerCase();

    const isFogging = lower.includes('fog') || lower.includes('หมอกควัน') || lower.includes('หมอก') || lower.includes('thermal');
    const isULV = lower.includes('ulv') || lower.includes('ฝอยละเอียด') || lower.includes('ยูแอลวี');

    const extracted = extractFormulaParams(userQuery);

    // ตรวจว่าเป็นสารเคมีที่รู้จักในระบบหรือไม่
    const KNOWN_BRANDS = ['deltacide', 'เดลตา', 'submarine', 'ซับมาริน', 'fendona', 'เฟนโดนา', 'k-othrine', 'โอทริน', 'โอธริน', 'aqua resigen', 'resigen', 'อควา'];
    const isKnownBrand = extracted.chemicalName
        ? KNOWN_BRANDS.some(b => extracted.chemicalName!.toLowerCase().includes(b) || b.includes(extracted.chemicalName!.toLowerCase()))
        : false;

    // ผู้ใช้ระบุสารเคมีตัวใหม่ที่ไม่รู้จัก → สร้างสูตรใหม่ทันที
    if (extracted.chemicalName && !isKnownBrand) {
        return buildCustomFormula(extracted, 'create');
    }

    let searchTerm = '';
    if (lower.includes('เดลตา') || lower.includes('delta') || lower.includes('deltacide')) {
        searchTerm = 'Deltacide';
    } else if (lower.includes('ซับมาริน') || lower.includes('submarine')) {
        searchTerm = 'Submarine';
    } else if (lower.includes('fendona') || lower.includes('เฟนโดนา')) {
        searchTerm = 'Fendona';
    } else if (lower.includes('k-othrine') || lower.includes('โอทริน') || lower.includes('โอธริน')) {
        searchTerm = 'K-Othrine';
    } else if (lower.includes('aqua') || lower.includes('resigen') || lower.includes('อควา')) {
        searchTerm = 'Aqua Resigen';
    }

    if (searchTerm) {
        const suffix = isFogging ? 'หมอกควัน' : isULV ? 'ULV' : '';
        const results = await queryChemicalProfiles({ search: `${searchTerm} ${suffix}`.trim() });
        const list = results.profiles as ProfileRow[];

        if (list.length > 0) {
            const profile = list[0];
            const mixLabel = profile.mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';

            return {
                text: `🧪 **Supabase พบข้อมูล:** "${profile.name}"

📋 สัดส่วนที่แนะนำตามมาตรฐาน DDC:
• สัดส่วน (C:S) = ${profile.C} : ${profile.S} (${mixLabel})
• อัตราพ่น = ${profile.RA} ${profile.RA_unit} ต่อ ${profile.A0.toLocaleString()} ตร.ม.
• จำนวนบ้านประมาณ = ${Math.round(profile.A0 / 100)} หลัง (บ้านละ 100 ตร.ม.)

💧 **วิธีผสมต่อน้ำยาผสม 10 ลิตร:**
${
    profile.mix_type === 2
        ? `• ตวงสารเคมี = ${(10000 * profile.C / profile.S).toFixed(0)} มล.
• เติมน้ำมัน/น้ำ = ${(10000 - (10000 * profile.C / profile.S)).toFixed(0)} มล.`
        : `• ตวงสารเคมี = ${(10000 * profile.C / (profile.C + profile.S)).toFixed(0)} มล.
• เติมน้ำมัน/น้ำ = ${(10000 * profile.S / (profile.C + profile.S)).toFixed(0)} มล.`
}

⚠️ **คำเตือน:** ใส่ PPE ทุกครั้งก่อนผสมและพ่นสารเคมี`,
                formula: {
                    name: profile.name,
                    description: profile.description || '',
                    C: profile.C,
                    S: profile.S,
                    RA: profile.RA,
                    RA_unit: profile.RA_unit as 'L' | 'cc',
                    mix_type: profile.mix_type,
                    A0: profile.A0,
                },
            };
        }
    }

    const profiles = await queryChemicalProfiles({ search: '' });
    const allProfiles = profiles.profiles as ProfileRow[];
    const profile = allProfiles[0];

    const params = extractFormulaParams(userQuery);

    // ผู้ใช้ระบุชื่อสารเคมีใหม่ แต่ไม่พบในฐานข้อมูล — สร้างสูตรใหม่ตามที่ระบุ
    if (params.chemicalName) {
        return buildCustomFormula(params, 'create');
    }

    // ไม่มีข้อมูลในฐานข้อมูลเลย — สร้างสูตรใหม่จากพารามิเตอร์ที่ผู้ใช้ระบุ
    if (!profile) {
        return buildCustomFormula(params, 'create');
    }

    return {
        text: `🧪 ขอแนะนำสูตร "${profile.name}" จากฐานข้อมูล Supabase`,
        formula: {
            name: profile.name,
            description: profile.description || '',
            C: profile.C,
            S: profile.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit as 'L' | 'cc',
            mix_type: profile.mix_type,
            A0: profile.A0,
        },
    };
}

/** Compare two chemicals using Supabase data */
export async function buildChemicalComparison(userQuery: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const lower = userQuery.toLowerCase();

    const BRAND_ALIASES: { brand: string; keys: string[] }[] = [
        { brand: 'Deltacide', keys: ['deltacide', 'เดลตา'] },
        { brand: 'Submarine', keys: ['submarine', 'ซับมาริน'] },
        { brand: 'Fendona', keys: ['fendona', 'เฟนโดนา'] },
        { brand: 'K-Othrine', keys: ['k-othrine', 'โอทริน', 'โอธริน'] },
        { brand: 'Aqua Resigen', keys: ['aqua', 'resigen', 'อควา'] },
    ];

    const findBrand = (text: string): string | null => {
        for (const { brand, keys } of BRAND_ALIASES) {
            if (keys.some(k => text.includes(k))) return brand;
        }
        return null;
    };

    // แยกเคมีตัวแรก / ตัวที่สองจาก "เทียบ X กับ Y" / "X vs Y" / "X และ Y"
    const parts = lower.split(/กับ|vs\.?|และ|เทียบ|เปรียบเทียบ/).map(s => s.trim()).filter(Boolean);
    const mentioned = [...new Set(lower.match(/deltacide|เดลตา|submarine|ซับมาริน|fendona|เฟนโดนา|k-othrine|โอทริน|โอธริน|aqua|resigen|อควา/g) || [])];

    let chem1 = 'Deltacide';
    let chem2 = 'Submarine';

    if (mentioned.length >= 2) {
        const b1 = findBrand(parts[0] || mentioned[0]) || findBrand(mentioned[0]) || chem1;
        const b2 = findBrand(mentioned[1]) || chem2;
        chem1 = b1;
        chem2 = b2;
    } else {
        const b1 = findBrand(lower) || chem1;
        const b2 = mentioned.length === 1 && b1 === findBrand(lower)
            ? BRAND_ALIASES.find(a => a.brand !== b1)?.brand || chem2
            : chem2;
        chem1 = b1;
        chem2 = b2;
    }

    if (chem1 === chem2) {
        const other = BRAND_ALIASES.find(a => a.brand !== chem1)?.brand || 'Submarine';
        chem2 = other;
    }

    const r1 = await queryChemicalProfiles({ search: chem1 });
    const r2 = await queryChemicalProfiles({ search: chem2 });

    const p1 = (r1.profiles as ProfileRow[])[0];
    const p2 = (r2.profiles as ProfileRow[])[0];

    if (!p1 || !p2) {
        return {
            text: `⚠️ ไม่พบข้อมูล "${!p1 ? chem1 : chem2}" ในฐานข้อมูล Supabase`,
        };
    }

    return {
        text: `📊 **เปรียบเทียบ ${p1.name} vs ${p2.name} (จาก Supabase)**

| รายการ | ${p1.name} | ${p2.name} |
|---|---|---|
| สัดส่วน C:S | ${p1.C}:${p1.S} | ${p2.C}:${p2.S} |
| อัตราพ่น | ${p1.RA} ${p1.RA_unit} | ${p2.RA} ${p2.RA_unit} |
| พื้นที่มาตรฐาน | ${p1.A0.toLocaleString()} ตร.ม. | ${p2.A0.toLocaleString()} ตร.ม. |
| ประเภทผสม | ${p1.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'} | ${p2.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'} |

💡 **ข้อแนะนำ:** เลือก ${p1.name} สำหรับการพ่นในพื้นที่เปิด และ ${p2.name} สำหรับพื้นที่อับหรือต้องการการปกคลุมนาน`,
    };
}

// Re-export จาก fallback เพื่อ queries.ts ใช้เอง (ไม่ก่อ circular dep เพราะ queries→types เท่านั้น)
import { extractFormulaParams, buildCustomFormula } from './fallback';
export type { ExtractedFormulaParams };