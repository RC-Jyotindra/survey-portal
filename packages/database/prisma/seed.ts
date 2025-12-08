import { PrismaClient, ProductCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // --- Seed Products ---
  const products = [
    { code: ProductCode.SB, name: 'Survey Builder' },
    { code: ProductCode.PM, name: 'Project Management' },
    { code: ProductCode.PMM, name: 'Panel Management' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: { name: p.name, isActive: true },
      create: {
        code: p.code,
        name: p.name,
        isActive: true,
      },
    });
  }

  console.log('✅ Products seeded');

  // --- Seed a Tenant ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: { name: 'Demo Tenant', isActive: true },
    create: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
      isActive: true,
      tierCode: 'FREE',
    },
  });

  console.log(`✅ Tenant seeded: ${tenant.name} (${tenant.slug})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
