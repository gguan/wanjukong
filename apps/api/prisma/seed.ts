import { PrismaClient, ProductStatus, SaleType } from '@prisma/client';

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
  type SeedProduct = {
    name: string;
    slug: string;
    description: string;
    scale: string;
    status: ProductStatus;
    saleType?: SaleType;
    preorderStartAt?: Date;
    preorderEndAt?: Date;
    estimatedShipAt?: Date;
    brandId: string;
    categoryId: string;
  };

  const products: SeedProduct[] = [
    {
      name: 'Hot Toys MMS617 Spider-Man No Way Home 1/6',
      slug: 'hot-toys-spider-man-nwh',
      description:
        'Spider-Man (Integrated Suit) 1/6th scale collectible figure',
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      brandId: hotToys.id,
      categoryId: figure.id,
    },
    {
      name: 'Hot Toys MMS656 The Batman 1/6',
      slug: 'hot-toys-the-batman',
      description: 'The Batman 1/6th scale collectible figure',
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      saleType: SaleType.PREORDER,
      preorderStartAt: new Date('2026-04-01T00:00:00Z'),
      preorderEndAt: new Date('2026-06-01T00:00:00Z'),
      estimatedShipAt: new Date('2026-10-01T00:00:00Z'),
      brandId: hotToys.id,
      categoryId: figure.id,
    },
    {
      name: 'DAM DMS032 Assassins Creed Altair 1/6',
      slug: 'dam-assassins-creed-altair',
      description: "Altair the Mentor Assassin's Creed collectible figure",
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      brandId: dam.id,
      categoryId: figure.id,
    },
    {
      name: 'Threezero Ultraman Suit 1/6',
      slug: 'threezero-ultraman-suit',
      description: 'Ultraman Suit anime edition 1/6th scale figure',
      scale: '1/6',
      status: ProductStatus.DRAFT,
      brandId: threezero.id,
      categoryId: figure.id,
    },
    {
      name: 'Hot Toys Headsculpt Tony Stark MK85',
      slug: 'hot-toys-headsculpt-tony-stark-mk85',
      description: 'Tony Stark battle damaged head sculpt for MK85',
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      brandId: hotToys.id,
      categoryId: headSculpt.id,
    },
    {
      name: 'DAM Narrow Shoulder Body 2.0',
      slug: 'dam-narrow-shoulder-body-2',
      description: 'DAM narrow shoulder male body version 2.0',
      scale: '1/6',
      status: ProductStatus.ACTIVE,
      brandId: dam.id,
      categoryId: body.id,
    },
    {
      name: 'Hot Toys Tactical Suit Set MMS',
      slug: 'hot-toys-tactical-suit-set',
      description: 'Generic tactical clothing set for 1/6 figures',
      scale: '1/6',
      status: ProductStatus.INACTIVE,
      brandId: hotToys.id,
      categoryId: clothing.id,
    },
  ];

  for (const p of products) {
    const {
      saleType,
      preorderStartAt,
      preorderEndAt,
      estimatedShipAt,
      ...baseProduct
    } = p;

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        ...(saleType ? { saleType } : {}),
        ...(preorderStartAt ? { preorderStartAt } : {}),
        ...(preorderEndAt ? { preorderEndAt } : {}),
        ...(estimatedShipAt ? { estimatedShipAt } : {}),
      },
      create: {
        ...baseProduct,
        ...(saleType ? { saleType } : {}),
        ...(preorderStartAt ? { preorderStartAt } : {}),
        ...(preorderEndAt ? { preorderEndAt } : {}),
        ...(estimatedShipAt ? { estimatedShipAt } : {}),
      },
    });
  }

  // Product Variants
  const spiderman = await prisma.product.findUnique({ where: { slug: 'hot-toys-spider-man-nwh' } });
  const batman = await prisma.product.findUnique({ where: { slug: 'hot-toys-the-batman' } });
  const altair = await prisma.product.findUnique({ where: { slug: 'dam-assassins-creed-altair' } });
  const tonyHead = await prisma.product.findUnique({ where: { slug: 'hot-toys-headsculpt-tony-stark-mk85' } });
  const damBody = await prisma.product.findUnique({ where: { slug: 'dam-narrow-shoulder-body-2' } });

  const variants = [
    // Spider-Man: 2 variants
    {
      productId: spiderman!.id,
      name: 'Standard Edition',
      versionCode: 'standard',
      sku: 'HT-MMS617-STD',
      priceCents: 27500,
      stock: 8,
      isDefault: true,
      sortOrder: 0,
      subtitle: 'Standard figure with basic accessories',
      specifications: 'Height: ~29cm\nPoints of articulation: 30+\nAccessories: 4 pairs of hands, web-shooting effect',
    },
    {
      productId: spiderman!.id,
      name: 'Deluxe Edition',
      versionCode: 'deluxe',
      sku: 'HT-MMS617-DLX',
      priceCents: 35000,
      stock: 3,
      isDefault: false,
      sortOrder: 1,
      subtitle: 'Includes extra hands, web effects, and display base',
      specifications: 'Height: ~29cm\nPoints of articulation: 30+\nAccessories: 8 pairs of hands, web effects, dynamic base, Mysterio drone',
    },
    // Batman: 2 variants
    {
      productId: batman!.id,
      name: 'Standard Edition',
      versionCode: 'standard',
      sku: 'HT-MMS656-STD',
      priceCents: 31000,
      stock: 0,
      isDefault: true,
      sortOrder: 0,
      subtitle: 'Standard figure with batarang',
    },
    {
      productId: batman!.id,
      name: 'Deluxe Edition',
      versionCode: 'deluxe',
      sku: 'HT-MMS656-DLX',
      priceCents: 39500,
      stock: 0,
      isDefault: false,
      sortOrder: 1,
      subtitle: 'Includes Bat-Signal base and extra accessories',
    },
    // Altair: 1 variant
    {
      productId: altair!.id,
      name: 'Standard Edition',
      versionCode: 'standard',
      sku: 'DAM-DMS032-STD',
      priceCents: 23000,
      stock: 5,
      isDefault: true,
      sortOrder: 0,
    },
    // Tony Head: 1 variant
    {
      productId: tonyHead!.id,
      name: 'Standard',
      versionCode: 'standard',
      sku: 'HT-HS-TONY-MK85',
      priceCents: 4500,
      stock: 20,
      isDefault: true,
      sortOrder: 0,
    },
    // DAM Body: 1 variant
    {
      productId: damBody!.id,
      name: 'Standard',
      versionCode: 'standard',
      sku: 'DAM-BODY-NS-2',
      priceCents: 3800,
      stock: 15,
      isDefault: true,
      sortOrder: 0,
    },
  ];

  for (const v of variants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        priceCents: v.priceCents,
        stock: v.stock,
        specifications: 'specifications' in v ? v.specifications : undefined,
      },
      create: v,
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
