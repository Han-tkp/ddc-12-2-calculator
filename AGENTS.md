# AGENTS.md - Development Guidelines

## Project Overview

This is a Next.js 16 application with TypeScript for a DDC (Department of Disease Control) calculator. It uses:
- **Framework**: Next.js 16 with App Router
- **UI**: Tailwind CSS v4, shadcn/ui components, Radix UI primitives
- **Database**: Supabase
- **Auth**: next-auth v5
- **Validation**: Zod + React Hook Form
- **Icons**: Lucide React
- **Charts**: Recharts
- **Maps**: Leaflet

---

## Build / Lint / Test Commands

### Development
```bash
npm run dev          # Start development server
```

### Build
```bash
npm run build        # Production build
npm run start        # Start production server
```

### Linting
```bash
npm run lint         # Run ESLint
```

### Testing
```bash
npx vitest           # Run all tests
npx vitest run       # Run tests once
npx vitest run src/lib/calculations.test.ts  # Run single test file
npx vitest --watch   # Watch mode
```

---

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - Do not disable strict checks
- Use explicit types for function parameters and return types
- Use `z.infer` from Zod to derive types from schemas
- Avoid `any` - use `unknown` if type is truly unknown

### Imports

- Use path aliases (`@/*` maps to `./src/*`)
- Order imports: external libs → internal libs → components
- Group by: React imports → other imports → component imports

```typescript
import { useState } from 'react'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

### Naming Conventions

- **Files**: kebab-case for utilities (`calculations.ts`), PascalCase for components (`Button.tsx`)
- **Functions**: camelCase, verb + noun (`calculate()`, `getUserById()`)
- **Interfaces/Types**: PascalCase with descriptive names (`CalculationInput`)
- **Constants**: SCREAMING_SNAKE_CASE for config values

### Components

- Use shadcn/ui component patterns (cva for variants, Radix primitives)
- Use functional components with explicit props typing
- Extract reusable logic into custom hooks in `@/hooks`
- Keep components focused (single responsibility)

### API Routes

- Use Next.js App Router (`src/app/api/*/route.ts`)
- Always wrap in try/catch with proper error handling
- Return appropriate HTTP status codes (200, 201, 400, 401, 500)
- Validate input with Zod schemas
- Use `NextResponse.json()` for responses

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const result = doCalculation(body)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### Validation (Zod)

- Use Thai error messages for user-facing validation
- Chain validators with `.number()`, `.string()`, `.object()`, etc.
- Use `.optional()` and `.nullable()` appropriately
- Derive TypeScript types with `z.infer`

```typescript
export const calculationSchema = z.object({
  C: z.number().positive('สัดส่วนสารออกฤทธิ์ต้องเป็นจำนวนบวก'),
  RA_unit: z.enum(['L', 'cc']),
})
export type CalculationInput = z.infer<typeof calculationSchema>
```

### Error Handling

- Throw descriptive errors in Thai for user-facing errors
- Log server errors appropriately
- Handle both Error and ZodError types in catch blocks
- Never expose sensitive information in error responses

### Database (Supabase)

- Use the `supabase` client from `@/lib/supabase`
- Always check `.error` from Supabase responses
- Use proper TypeScript types for database rows

### Styling (Tailwind CSS v4)

- Use utility classes with Tailwind CSS v4 syntax
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow shadcn/ui conventions (new-york style)
- Use CSS variables for theming in `globals.css`

### Environment Variables

- Never commit `.env` files
- Use `.env.example` for required variables
- Prefix local variables with `.env.local`

### Git Conventions

- Use meaningful commit messages
- Run `npm run lint` before committing
- Do not commit build artifacts or `.next/` directory
