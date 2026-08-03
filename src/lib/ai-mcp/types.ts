/**
 * Shared types + helpers สำหรับ AI / MCP module
 */

/** Formula schema returned to the chatbot UI */
export interface AIFormulaResult {
    name: string;
    description: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
    tankCapacity: number;
}

export interface ChatResponse {
    text: string;
    formula?: AIFormulaResult;
}

export interface FormulaDraftInput {
    fileName: string;
    headers: string[];
    rows: (string | number)[][];
}

export interface FileAnalysisResult {
    text: string;
    formula?: AIFormulaResult;
}

export type Intent = 'calculate' | 'create_formula' | 'query_chemical' | 'query_history' | 'general_chat' | 'compare_chemicals';

export interface ExtractedFormulaParams {
    chemicalName?: string;
    C?: number;
    S?: number;
    RA?: number;
    RA_unit?: 'L' | 'cc';
    tankCapacity?: number;
    method?: 'ULV' | 'fogging';
    A0?: number;
}

/** แปลงค่า cell ในไฟล์ (ที่อาจมี comma คั่นหลักพัน) เป็นตัวเลข หรือ undefined */
export function asNumber(value: unknown): number | undefined {
    const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
}