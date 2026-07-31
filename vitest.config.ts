/**
 * Vitest workspace config — รองรับ `@/*` path alias (ใช้ใน source code)
 *
 * แยกเป็น 2 projects ที่ resolve แยกกัน:
 * - `unit`: tests ที่ใช้ `@/*` alias ตรงๆ (เช่น ai-mcp/crud.test.ts)
 * - `legacy`: tests เก่า (ai-mcp, ai) — ก็ต้องการ alias เพราะ ai/ai.test.ts
 *   import chain ผ่าน ai/tools.ts → ai-mcp/crud.ts ที่ใช้ `@/lib/...`
 *
 * ทั้งสอง projects ใช้ resolve.alias เดียวกัน (vitest 4 + Next.js 16 มี
 * incompat ตอน resolve `next/server` ผ่าน Next.js plugin — pre-existing
 * issue; legacy บาง suite อาจ fail จาก chain ลึกถึง next-auth)
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                    exclude: ['src/lib/ai-mcp.test.ts', 'src/lib/ai/**/*.test.ts'],
                },
                resolve: { alias },
            },
            {
                test: {
                    name: 'legacy',
                    include: ['src/lib/ai-mcp.test.ts', 'src/lib/ai/**/*.test.ts'],
                },
                resolve: { alias },
            },
        ],
    },
});