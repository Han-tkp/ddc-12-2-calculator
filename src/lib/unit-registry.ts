// Unit Registry & Dimensional Compatibility Engine for DDC 12.2 Chemical Calculator

export type UnitCategory = 'area' | 'volume' | 'concentration' | 'rate' | 'dimensionless';

export interface UnitDefinition {
    id: string;
    name: string;
    symbol: string;
    category: UnitCategory;
    toBase: (val: number) => number;
    fromBase: (val: number) => number;
}

export const UNIT_REGISTRY: Record<string, UnitDefinition> = {
    // Area Units (Base: m²)
    m2: {
        id: 'm2',
        name: 'ตารางเมตร',
        symbol: 'm²',
        category: 'area',
        toBase: (v) => v,
        fromBase: (v) => v,
    },
    sq_wa: {
        id: 'sq_wa',
        name: 'ตารางวา',
        symbol: 'ตร.วา',
        category: 'area',
        toBase: (v) => v * 4,
        fromBase: (v) => v / 4,
    },
    ngan: {
        id: 'ngan',
        name: 'งาน',
        symbol: 'งาน',
        category: 'area',
        toBase: (v) => v * 400,
        fromBase: (v) => v / 400,
    },
    rai: {
        id: 'rai',
        name: 'ไร่',
        symbol: 'ไร่',
        category: 'area',
        toBase: (v) => v * 1600,
        fromBase: (v) => v / 1600,
    },
    ha: {
        id: 'ha',
        name: 'เฮกตาร์',
        symbol: 'ha',
        category: 'area',
        toBase: (v) => v * 10000,
        fromBase: (v) => v / 10000,
    },

    // Volume Units (Base: mL / cc)
    mL: {
        id: 'mL',
        name: 'มิลลิลิตร / ซีซี',
        symbol: 'mL',
        category: 'volume',
        toBase: (v) => v,
        fromBase: (v) => v,
    },
    cc: {
        id: 'cc',
        name: 'ซีซี (cc)',
        symbol: 'cc',
        category: 'volume',
        toBase: (v) => v,
        fromBase: (v) => v,
    },
    L: {
        id: 'L',
        name: 'ลิตร',
        symbol: 'L',
        category: 'volume',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
    },
    gal: {
        id: 'gal',
        name: 'แกลลอน',
        symbol: 'gal',
        category: 'volume',
        toBase: (v) => v * 3785.41,
        fromBase: (v) => v / 3785.41,
    },

    // Spray Rate Units (Base: mL/m²)
    rate_cc_1000m2: {
        id: 'rate_cc_1000m2',
        name: 'มล. ต่อ 1,000 ตร.ม.',
        symbol: 'mL/1,000m²',
        category: 'rate',
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
    },
    rate_L_1000m2: {
        id: 'rate_L_1000m2',
        name: 'ลิตร ต่อ 1,000 ตร.ม.',
        symbol: 'L/1,000m²',
        category: 'rate',
        toBase: (v) => v,
        fromBase: (v) => v,
    },

    // Dimensionless / Ratio
    ratio: {
        id: 'ratio',
        name: 'อัตราส่วน (สัดส่วน)',
        symbol: 'ratio',
        category: 'dimensionless',
        toBase: (v) => v,
        fromBase: (v) => v,
    },
    percent: {
        id: 'percent',
        name: 'เปอร์เซ็นต์ (%)',
        symbol: '%',
        category: 'dimensionless',
        toBase: (v) => v / 100,
        fromBase: (v) => v * 100,
    },
    ppm: {
        id: 'ppm',
        name: 'ส่วนในล้านส่วน (ppm)',
        symbol: 'ppm',
        category: 'dimensionless',
        toBase: (v) => v / 1000000,
        fromBase: (v) => v * 1000000,
    },
};

/**
 * Validates whether two unit categories can be operated together.
 * Returns { valid: boolean, errorMsg?: string }
 */
export function validateUnitCompatibility(
    operator: '+' | '-' | '*' | '/',
    unitA: UnitCategory,
    unitB: UnitCategory
): { valid: boolean; resultCategory: UnitCategory; errorMsg?: string } {
    if (operator === '+' || operator === '-') {
        if (unitA !== unitB && unitA !== 'dimensionless' && unitB !== 'dimensionless') {
            return {
                valid: false,
                resultCategory: unitA,
                errorMsg: `ไม่สามารถนำหน่วย "${unitA}" มา${operator === '+' ? 'บวก' : 'ลบ'} กับหน่วย "${unitB}" ได้`,
            };
        }
        return { valid: true, resultCategory: unitA };
    }

    if (operator === '*') {
        if (unitA === 'area' && unitB === 'rate') return { valid: true, resultCategory: 'volume' };
        if (unitB === 'area' && unitA === 'rate') return { valid: true, resultCategory: 'volume' };
        if (unitA === 'dimensionless') return { valid: true, resultCategory: unitB };
        if (unitB === 'dimensionless') return { valid: true, resultCategory: unitA };
        return { valid: true, resultCategory: unitA };
    }

    if (operator === '/') {
        if (unitA === unitB) return { valid: true, resultCategory: 'dimensionless' };
        if (unitA === 'volume' && unitB === 'area') return { valid: true, resultCategory: 'rate' };
        if (unitB === 'dimensionless') return { valid: true, resultCategory: unitA };
        return { valid: true, resultCategory: unitA };
    }

    return { valid: true, resultCategory: unitA };
}
