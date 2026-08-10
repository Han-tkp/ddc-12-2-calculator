/**
 * Vitest config — รองรับ `@/*` path alias (ใช้ใน source code)
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
    resolve: { alias },
    test: {
        include: ['src/**/*.test.ts'],
    },
});
