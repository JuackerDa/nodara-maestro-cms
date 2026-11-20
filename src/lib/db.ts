import 'server-only'
import { PrismaClient } from '@prisma/client'

const globalDb = globalThis as typeof globalThis & { nodaraDb?: PrismaClient }
export const db = globalDb.nodaraDb ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalDb.nodaraDb = db
