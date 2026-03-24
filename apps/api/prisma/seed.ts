import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.upsert({
    where: { key: 'site_name' },
    update: {},
    create: { key: 'site_name', value: 'wanjukong' },
  });

  await prisma.healthCheckLog.create({
    data: { status: 'ok', message: 'Initial seed' },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
