import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL

    // If using Turso (libsql:// or https:// with adapter)
    if (url && (url.startsWith('libsql://') || url.startsWith('https://'))) {
        const libsql = createClient({
            url: process.env.DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN,
        })
        const adapter = new PrismaLibSql(libsql as any)
        return new PrismaClient({ adapter: adapter as any })
    }

    // Fallback to default (SQLite file)
    return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db
