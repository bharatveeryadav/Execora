import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (be careful in production!)
  await prisma.conversationRecording.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  console.log('📦 Creating products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Milk',
        description: 'Fresh milk 1L',
        price: new Decimal(60),
        stock: 50,
        unit: 'packet',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bread',
        description: 'White bread',
        price: new Decimal(40),
        stock: 30,
        unit: 'packet',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Eggs',
        description: 'Farm eggs',
        price: new Decimal(6),
        stock: 200,
        unit: 'piece',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Rice',
        description: 'Basmati rice',
        price: new Decimal(80),
        stock: 100,
        unit: 'kg',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Oil',
        description: 'Cooking oil',
        price: new Decimal(150),
        stock: 20,
        unit: 'liter',
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  console.log('👥 Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rahul Sharma',
        phone: '+919876543210',
        nickname: 'Rahul',
        landmark: 'Temple ke paas',
        balance: new Decimal(500),
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Patel',
        phone: '+919876543211',
        nickname: 'Priya',
        landmark: 'School ke saamne',
        balance: new Decimal(0),
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Suresh Kumar',
        phone: '+919876543212',
        nickname: 'Suresh',
        landmark: 'Market',
        balance: new Decimal(1500),
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Singh',
        phone: '+919876543213',
        nickname: 'Amit',
        notes: 'Electrician',
        balance: new Decimal(200),
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Kavita Desai',
        phone: '+919876543214',
        nickname: 'Kavita',
        landmark: 'Bus stand',
        balance: new Decimal(0),
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  console.log('📝 Creating sample invoices...');
  
  // Create invoice for Rahul
  const invoice1 = await prisma.invoice.create({
    data: {
      customerId: customers[0].id,
      total: new Decimal(120),
      status: 'CONFIRMED',
      items: {
        create: [
          {
            productId: products[0].id, // Milk
            quantity: 2,
            price: products[0].price,
            total: new Decimal(120),
          },
        ],
      },
    },
  });

  // Create ledger entry for invoice
  await prisma.ledgerEntry.create({
    data: {
      customerId: customers[0].id,
      type: 'DEBIT',
      amount: new Decimal(120),
      description: `Invoice #${invoice1.id.substring(0, 8)}`,
      reference: invoice1.id,
    },
  });

  // Update stock
  await prisma.product.update({
    where: { id: products[0].id },
    data: { stock: { decrement: 2 } },
  });

  console.log('✅ Created sample invoices and ledger entries');

  console.log('📅 Creating sample reminders...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  await prisma.reminder.create({
    data: {
      customerId: customers[2].id, // Suresh
      amount: new Decimal(1500),
      message: `Namaste Suresh Kumar ji,\n\n₹1500 payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`,
      sendAt: tomorrow,
      status: 'SCHEDULED',
    },
  });

  console.log('✅ Created sample reminders');

  console.log('💰 Setting opening balances...');
  
  await prisma.ledgerEntry.create({
    data: {
      customerId: customers[2].id, // Suresh
      type: 'OPENING_BALANCE',
      amount: new Decimal(1500),
      description: 'Opening balance',
    },
  });

  console.log('✅ Set opening balances');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Sample data created:');
  console.log(`- ${products.length} products`);
  console.log(`- ${customers.length} customers`);
  console.log('- 1 invoice');
  console.log('- 1 reminder');
  console.log('\nYou can now test the application with this data.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
