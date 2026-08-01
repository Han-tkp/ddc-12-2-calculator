/**
 * AI / MCP module — public surface (re-exports)
 *
 * Architecture (แยกเป็นโมดูลย่อยเพื่อ readability):
 *   - drafts:    deterministic extraction (ไฟล์มีโครงสร้าง / ข้อความฉลาก)
 *   - vision:    LLM-based image analysis (ตอน deterministic ไม่ได้ + provider พร้อม)
 *   - fallback:  rule-based (intent + extract + custom + file analysis) — ใช้ตอนไม่มี AI
 *   - queries:   Supabase data builders (query_chemical / create_formula / compare)
 *   - crud:      AI tool handlers (auth + audit) — import ตรงจาก './crud'
 *                (ไม่ re-export ที่นี่เพราะ crud.ts ใช้ `@/lib/auth` ที่ pull next-auth)
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
export { classifyIntent, extractFormulaParams, buildCustomFormula, buildFileAnalysis, buildCalculationResponse } from './fallback';
export type { CalculationRequest } from './fallback';

// queries (Supabase)
export {
    buildFormulaFromSupabase,
    buildNewFormulaRecommendation,
    buildChemicalComparison,
    queryChemicalProfiles,
    queryCalculations,
} from './queries';

// crud (AI tool handlers — auth + audit) — import ตรงจาก './crud' เพื่อหลีกเลี่ยง
// next-auth dependency chain ใน test suites ที่ไม่ต้องการ
// export { createChemicalProfile, updateChemicalProfile, deleteChemicalProfile } from './crud';
export type { CrudResult } from './crud';