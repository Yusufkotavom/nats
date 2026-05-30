import { prisma } from '@/lib/prisma'

async function main() {
  const email = 'platform@example.com'
  const existingUser = await prisma.user.findUnique({ where: { email } })
  console.log('existingUser?', Boolean(existingUser))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
