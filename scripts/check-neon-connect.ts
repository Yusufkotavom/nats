import { Client } from 'pg'

const candidates: Array<[string, string | undefined]> = [
  ['DATABASE_URL_UNPOOLED', process.env.DATABASE_URL_UNPOOLED],
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
]

async function tryOne(name: string, cs?: string) {
  if (!cs) return console.log(name, 'missing')
  const start = Date.now()
  const client = new Client({ connectionString: cs, connectionTimeoutMillis: 10000, query_timeout: 10000 })
  try {
    await client.connect()
    const r = await client.query('select 1 as ok')
    console.log(name, 'OK', Date.now()-start, 'ms', r.rows[0]?.ok)
  } catch (e: any) {
    console.log(name, 'ERR', Date.now()-start, 'ms', e?.code || e?.message)
  } finally {
    try { await client.end() } catch {}
  }
}

async function main() {
  for (const [n, cs] of candidates) {
    await tryOne(n, cs)
  }
}

main().catch((e)=>{
  console.error(e)
  process.exit(1)
})
