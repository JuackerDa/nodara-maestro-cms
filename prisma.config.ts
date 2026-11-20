import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

const sqlite = 'prisma/schema.prisma'
const postgres = 'prisma/.generated-postgres.prisma'
const url = process.env.DATABASE_URL
const usePostgres = !!url && /^postgres(?:ql)?:\/\//.test(url)
if (url && !usePostgres && !url.startsWith('file:')) {
  throw new Error('DATABASE_URL debe usar postgresql://, postgres:// o file:.')
}
if (usePostgres) {
  writeFileSync(postgres, readFileSync(sqlite, 'utf8')
    .replace('provider = "sqlite"', 'provider = "postgresql"')
    .replace('url      = "file:./dev.db"', 'url      = env("DATABASE_URL")'))
} else if (url && url !== 'file:./dev.db') {
  writeFileSync(postgres, readFileSync(sqlite, 'utf8')
    .replace('url      = "file:./dev.db"', 'url      = env("DATABASE_URL")'))
}
export default defineConfig({
  schema: usePostgres || (url && url !== 'file:./dev.db') ? postgres : sqlite,
  migrations: { seed: 'tsx prisma/seed.ts' },
})
