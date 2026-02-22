import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const commonProducts = [
  { name: 'Aata', description: 'Wheat flour', price: 45, stock: 100, unit: 'kg' },
  { name: 'Cheeni', description: 'Sugar', price: 42, stock: 100, unit: 'kg' },
  { name: 'Dal', description: 'Lentils (mixed)', price: 90, stock: 50, unit: 'kg' },
  { name: 'Namak', description: 'Salt', price: 20, stock: 50, unit: 'packet' },
  { name: 'Chai', description: 'Tea leaves', price: 80, stock: 30, unit: 'packet' },
  { name: 'Doodh', description: 'Fresh milk 1L', price: 60, stock: 50, unit: 'packet' },
  { name: 'Ghee', description: 'Desi ghee', price: 500, stock: 20, unit: 'liter' },
  { name: 'Sarso Tel', description: 'Mustard oil', price: 160, stock: 20, unit: 'liter' },
  { name: 'Maida', description: 'Refined flour', price: 35, stock: 50, unit: 'kg' },
  { name: 'Chawal', description: 'Rice', price: 60, stock: 100, unit: 'kg' },
];

async function main() {
  console.log('Adding common Indian grocery products...');

  for (const product of commonProducts) {
    const existing = await prisma.product.findFirst({
      where: { name: { equals: product.name, mode: 'insensitive' } },
    });

    if (existing) {
      console.log(`  Skipped (already exists): ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: new Decimal(product.price),
          stock: product.stock,
          unit: product.unit,
        },
      });
      console.log(`  Added: ${product.name}`);
    }
  }

  console.log('\nDone! Products added successfully.');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
