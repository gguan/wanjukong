import { PrismaClient, ProductStatus, AvailabilityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // App config
  await prisma.appConfig.upsert({
    where: { key: 'site_name' },
    update: {},
    create: { key: 'site_name', value: 'wanjukong' },
  });

  // Brands
  const hotToys = await prisma.brand.upsert({
    where: { slug: 'hot-toys' },
    update: {},
    create: { name: 'Hot Toys', slug: 'hot-toys' },
  });

  const dam = await prisma.brand.upsert({
    where: { slug: 'dam' },
    update: {},
    create: { name: 'DAM', slug: 'dam' },
  });

  const threezero = await prisma.brand.upsert({
    where: { slug: 'threezero' },
    update: {},
    create: { name: 'Threezero', slug: 'threezero' },
  });

  // Categories
  const figure = await prisma.category.upsert({
    where: { slug: 'figure' },
    update: {},
    create: { name: 'Figure', slug: 'figure', sortOrder: 1 },
  });

  const headSculpt = await prisma.category.upsert({
    where: { slug: 'head-sculpt' },
    update: {},
    create: { name: 'Head Sculpt', slug: 'head-sculpt', sortOrder: 2 },
  });

  const body = await prisma.category.upsert({
    where: { slug: 'body' },
    update: {},
    create: { name: 'Body', slug: 'body', sortOrder: 3 },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: { name: 'Clothing', slug: 'clothing', sortOrder: 4 },
  });

  await prisma.category.upsert({
    where: { slug: 'weapon-gear' },
    update: {},
    create: { name: 'Weapon Gear', slug: 'weapon-gear', sortOrder: 5 },
  });

  await prisma.category.upsert({
    where: { slug: 'diorama-accessory' },
    update: {},
    create: {
      name: 'Diorama Accessory',
      slug: 'diorama-accessory',
      sortOrder: 6,
    },
  });

  // Products
  const products = [
    {
      name: 'Hot Toys MMS617 Spider-Man No Way Home 1/6',
      slug: 'hot-toys-spider-man-nwh',
      description:
        'Spider-Man (Integrated Suit) 1/6th scale collectible figure',
      price: 275.0,
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      availability: AvailabilityType.IN_STOCK,
      brandId: hotToys.id,
      categoryId: figure.id,
    },
    {
      name: 'Hot Toys MMS656 The Batman 1/6',
      slug: 'hot-toys-the-batman',
      description: 'The Batman 1/6th scale collectible figure',
      price: 310.0,
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      availability: AvailabilityType.PREORDER,
      brandId: hotToys.id,
      categoryId: figure.id,
    },
    {
      name: 'DAM DMS032 Assassins Creed Altair 1/6',
      slug: 'dam-assassins-creed-altair',
      description: "Altair the Mentor Assassin's Creed collectible figure",
      price: 230.0,
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      availability: AvailabilityType.IN_STOCK,
      brandId: dam.id,
      categoryId: figure.id,
    },
    {
      name: 'Threezero Ultraman Suit 1/6',
      slug: 'threezero-ultraman-suit',
      description: 'Ultraman Suit anime edition 1/6th scale figure',
      price: 199.0,
      scale: '1/6',
      status: ProductStatus.DRAFT,
      availability: AvailabilityType.PREORDER,
      brandId: threezero.id,
      categoryId: figure.id,
    },
    {
      name: 'Hot Toys Headsculpt Tony Stark MK85',
      slug: 'hot-toys-headsculpt-tony-stark-mk85',
      description: 'Tony Stark battle damaged head sculpt for MK85',
      price: 45.0,
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      availability: AvailabilityType.IN_STOCK,
      brandId: hotToys.id,
      categoryId: headSculpt.id,
    },
    {
      name: 'DAM Narrow Shoulder Body 2.0',
      slug: 'dam-narrow-shoulder-body-2',
      description: 'DAM narrow shoulder male body version 2.0',
      price: 38.0,
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      availability: AvailabilityType.IN_STOCK,
      brandId: dam.id,
      categoryId: body.id,
    },
    {
      name: 'Hot Toys Tactical Suit Set MMS',
      slug: 'hot-toys-tactical-suit-set',
      description: 'Generic tactical clothing set for 1/6 figures',
      price: 55.0,
      scale: '1/6',
      status: ProductStatus.INACTIVE,
      availability: AvailabilityType.IN_STOCK,
      brandId: hotToys.id,
      categoryId: clothing.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
