// @ts-ignore
import { PrismaClient } from '../generated/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
    log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db
    console.log('🔌 Database URL:', process.env.DATABASE_URL?.split('@')[1] || 'Unknown');
}

export default db
