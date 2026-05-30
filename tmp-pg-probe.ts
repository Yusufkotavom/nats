import { Client } from 'pg'

async function main() {
  const cs = process.env.DATABASE_URL!
  const client = new Client({ connectionString: cs })
  try {
    await client.connect()
    const r = await client.query('select now() as n')
    console.log('PG_OK', r.rows[0])
  } catch (e: any) {
    console.error('PG_ERR', e?.code, e?.message)
  } finally {
    await client.end().catch(() => undefined)
  }
}
main()
