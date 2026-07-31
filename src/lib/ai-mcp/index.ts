/**
 * AI / MCP module — public surface (re-exports)
 *
 * Architecture (แยกเป็นโมดูลย่อยเพื่อ readability):
 *   - drafts:    deterministic extraction (ไฟล์มีโครงสร้าง / ข้อความฉลาก)
 *   - vision:    LLM-based image analysis (ตอน deterministic ไม่ได้ + provider พร้อม)
 *   - fallback:  rule-based (intent + extract + custom + file analysis) — ใช้ตอนไม่มี AI
 *   - queries:   Supabase data builders (query_chemical / create_formula / compare)
 *
 * The AI ทำหน้าที่เป็น MCP intermediary — ไม่คำนวณเอง, เรียก Supabase / deterministic extraction
 */

export type {
    AIFormulaResult,
    ChatResponse,
    FormulaDraftInput,
    FileAnalysisResult,
    Intent,
    ExtractedFormulaParams,
} from './types';
export { asNumber } from './types';

// drafts
export { buildFormulaDraftFromFile, buildFormulaDraftFromText } from './drafts';

// vision
export { analyzeFormulaImage } from './vision';

// fallback (rule-based)
export { classifyIntent, extractFormulaParams, buildCustomFormula, buildFileAnalysis } from './fallback';

// queries (Supabase)
export {
    buildFormulaFromSupabase,
    buildNewFormulaRecommendation,
    buildChemicalComparison,
    queryChemicalProfiles,
    queryCalculations,
} from './queries';
