import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const TENANT_ID = process.env.SYSTEM_TENANT_ID || 'system-tenant-001';

// ─── Indian Kirana / Grocery Product Catalog ────────────────────────────────
// Prices are typical UP/Delhi NCR retail prices (₹) as of 2025.
// Unit: the unit the product is sold in (kg, litre, packet, piece, etc.)
// Stock: reasonable opening stock for a medium kirana shop.
// ─────────────────────────────────────────────────────────────────────────────

interface ProductSeed {
  name: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
}

const PRODUCTS: ProductSeed[] = [
  // ── Grains & Flour (Anaj) ──────────────────────────────────────────────────
  { name: 'Aata',        description: 'Gehun aata (wheat flour)',      category: 'Grains',  price: 40,   unit: 'kg',     stock: 200 },
  { name: 'Maida',       description: 'Refined wheat flour',           category: 'Grains',  price: 38,   unit: 'kg',     stock: 100 },
  { name: 'Besan',       description: 'Chickpea flour',                category: 'Grains',  price: 70,   unit: 'kg',     stock: 80  },
  { name: 'Suji',        description: 'Semolina / Rawa',               category: 'Grains',  price: 45,   unit: 'kg',     stock: 60  },
  { name: 'Chawal',      description: 'Basmati rice (medium grain)',   category: 'Grains',  price: 80,   unit: 'kg',     stock: 300 },
  { name: 'Basmati',     description: 'Premium basmati rice',          category: 'Grains',  price: 120,  unit: 'kg',     stock: 100 },
  { name: 'Poha',        description: 'Flattened rice (chiwda)',       category: 'Grains',  price: 55,   unit: 'kg',     stock: 50  },
  { name: 'Dalia',       description: 'Broken wheat porridge',         category: 'Grains',  price: 48,   unit: 'kg',     stock: 40  },
  { name: 'Sattu',       description: 'Roasted gram flour',            category: 'Grains',  price: 80,   unit: 'kg',     stock: 30  },
  { name: 'Cornflour',   description: 'Corn starch powder',            category: 'Grains',  price: 70,   unit: 'kg',     stock: 30  },

  // ── Pulses (Dal) ──────────────────────────────────────────────────────────
  { name: 'Arhar Dal',   description: 'Toor dal / pigeon pea',         category: 'Dal',     price: 130,  unit: 'kg',     stock: 100 },
  { name: 'Chana Dal',   description: 'Split Bengal gram',             category: 'Dal',     price: 90,   unit: 'kg',     stock: 80  },
  { name: 'Moong Dal',   description: 'Split green gram (dhuli)',      category: 'Dal',     price: 110,  unit: 'kg',     stock: 80  },
  { name: 'Urad Dal',    description: 'Black lentil split',            category: 'Dal',     price: 100,  unit: 'kg',     stock: 70  },
  { name: 'Masoor Dal',  description: 'Red lentil dal',                category: 'Dal',     price: 90,   unit: 'kg',     stock: 80  },
  { name: 'Rajma',       description: 'Kidney beans',                  category: 'Dal',     price: 120,  unit: 'kg',     stock: 60  },
  { name: 'Chana',       description: 'Whole Bengal gram (kala chana)',category: 'Dal',     price: 80,   unit: 'kg',     stock: 80  },
  { name: 'Matar',       description: 'Dried green peas',              category: 'Dal',     price: 70,   unit: 'kg',     stock: 60  },

  // ── Sugar, Salt & Sweeteners ──────────────────────────────────────────────
  { name: 'Cheeni',      description: 'White sugar (chini)',           category: 'Sugar',   price: 45,   unit: 'kg',     stock: 200 },
  { name: 'Shakkar',     description: 'Khandsari / brown sugar',       category: 'Sugar',   price: 50,   unit: 'kg',     stock: 80  },
  { name: 'Gud',         description: 'Jaggery (gur)',                 category: 'Sugar',   price: 60,   unit: 'kg',     stock: 50  },
  { name: 'Namak',       description: 'Salt (iodised)',                category: 'Sugar',   price: 20,   unit: 'kg',     stock: 150 },
  { name: 'Sendha Namak',description: 'Rock salt (pink salt)',         category: 'Sugar',   price: 35,   unit: 'kg',     stock: 40  },

  // ── Oils & Fats ───────────────────────────────────────────────────────────
  { name: 'Sarso Tel',   description: 'Mustard oil (kachi ghani)',     category: 'Oil',     price: 170,  unit: 'litre',  stock: 80  },
  { name: 'Sunflower Tel', description: 'Refined sunflower oil',       category: 'Oil',     price: 140,  unit: 'litre',  stock: 80  },
  { name: 'Soyabean Tel', description: 'Soyabean refined oil',        category: 'Oil',     price: 130,  unit: 'litre',  stock: 60  },
  { name: 'Desi Ghee',   description: 'Pure desi ghee',               category: 'Oil',     price: 600,  unit: 'kg',     stock: 30  },
  { name: 'Vanaspati',   description: 'Dalda / hydrogenated fat',      category: 'Oil',     price: 120,  unit: 'kg',     stock: 40  },
  { name: 'Coconut Oil', description: 'Naariyal tel',                  category: 'Oil',     price: 200,  unit: 'litre',  stock: 30  },

  // ── Spices (Masala) ───────────────────────────────────────────────────────
  { name: 'Haldi',       description: 'Turmeric powder',              category: 'Masala',  price: 150,  unit: 'kg',     stock: 50  },
  { name: 'Lal Mirchi',  description: 'Red chilli powder',            category: 'Masala',  price: 180,  unit: 'kg',     stock: 40  },
  { name: 'Dhaniya',     description: 'Coriander powder',             category: 'Masala',  price: 120,  unit: 'kg',     stock: 50  },
  { name: 'Jeera',       description: 'Cumin seeds / powder',         category: 'Masala',  price: 250,  unit: 'kg',     stock: 30  },
  { name: 'Garam Masala',description: 'Mixed spice powder',           category: 'Masala',  price: 300,  unit: 'kg',     stock: 25  },
  { name: 'Ajwain',      description: 'Carom seeds (bishop weed)',     category: 'Masala',  price: 200,  unit: 'kg',     stock: 20  },
  { name: 'Saunf',       description: 'Fennel seeds (mukhwas)',        category: 'Masala',  price: 180,  unit: 'kg',     stock: 20  },
  { name: 'Kali Mirch',  description: 'Black pepper (sabut/powder)',   category: 'Masala',  price: 400,  unit: 'kg',     stock: 15  },
  { name: 'Lavang',      description: 'Cloves (long)',                 category: 'Masala',  price: 800,  unit: 'kg',     stock: 10  },
  { name: 'Elaichi',     description: 'Green cardamom (choti)',        category: 'Masala',  price: 1200, unit: 'kg',     stock: 10  },
  { name: 'Dalchini',    description: 'Cinnamon bark',                category: 'Masala',  price: 600,  unit: 'kg',     stock: 10  },
  { name: 'Amchur',      description: 'Dry mango powder',             category: 'Masala',  price: 200,  unit: 'kg',     stock: 20  },
  { name: 'Imli',        description: 'Tamarind (seedless)',           category: 'Masala',  price: 100,  unit: 'kg',     stock: 25  },
  { name: 'Chaat Masala',description: 'Tangy chaat spice mix',        category: 'Masala',  price: 250,  unit: 'kg',     stock: 20  },

  // ── Dairy & Eggs ─────────────────────────────────────────────────────────
  { name: 'Doodh',       description: 'Full cream milk',              category: 'Dairy',   price: 62,   unit: 'litre',  stock: 100 },
  { name: 'Dahi',        description: 'Fresh curd / yoghurt',         category: 'Dairy',   price: 55,   unit: 'kg',     stock: 60  },
  { name: 'Paneer',      description: 'Cottage cheese',               category: 'Dairy',   price: 320,  unit: 'kg',     stock: 20  },
  { name: 'Butter',      description: 'White butter / Amul butter',   category: 'Dairy',   price: 550,  unit: 'kg',     stock: 15  },
  { name: 'Khoya',       description: 'Mawa / dried milk solids',     category: 'Dairy',   price: 320,  unit: 'kg',     stock: 10  },
  { name: 'Anda',        description: 'Eggs (dozen)',                  category: 'Dairy',   price: 7,    unit: 'piece',  stock: 300 },
  { name: 'Malai',       description: 'Fresh cream (thick malai)',     category: 'Dairy',   price: 80,   unit: 'kg',     stock: 20  },

  // ── Tea, Coffee & Beverages ───────────────────────────────────────────────
  { name: 'Chai Patti',  description: 'Tea leaves (dust/CTC)',        category: 'Beverage',price: 250,  unit: 'kg',     stock: 50  },
  { name: 'Coffee',      description: 'Instant coffee powder',         category: 'Beverage',price: 300,  unit: 'kg',     stock: 20  },
  { name: 'Horlicks',    description: 'Health drink powder',           category: 'Beverage',price: 360,  unit: 'kg',     stock: 15  },
  { name: 'Bournvita',   description: 'Cocoa health drink',            category: 'Beverage',price: 380,  unit: 'kg',     stock: 10  },
  { name: 'Coldrink',    description: 'Cold drink / soda bottle',      category: 'Beverage',price: 40,   unit: 'piece',  stock: 100 },
  { name: 'Paani',       description: 'Packaged drinking water 1L',    category: 'Beverage',price: 20,   unit: 'piece',  stock: 200 },

  // ── Biscuits, Snacks & Packaged Food ─────────────────────────────────────
  { name: 'Biscuit',     description: 'Parle-G / Marie biscuit 250g', category: 'Snacks',  price: 25,   unit: 'packet', stock: 150 },
  { name: 'Namkeen',     description: 'Salted mixture / bhujia',       category: 'Snacks',  price: 50,   unit: 'packet', stock: 80  },
  { name: 'Chips',       description: 'Potato chips (Lays/Uncle)',     category: 'Snacks',  price: 20,   unit: 'packet', stock: 100 },
  { name: 'Papad',       description: 'Urad dal papad',                category: 'Snacks',  price: 80,   unit: 'packet', stock: 40  },
  { name: 'Sewai',       description: 'Vermicelli (seviyan)',          category: 'Snacks',  price: 40,   unit: 'packet', stock: 40  },
  { name: 'Maggi',       description: 'Instant noodles Maggi 70g',    category: 'Snacks',  price: 15,   unit: 'piece',  stock: 100 },
  { name: 'Bread',       description: 'Bread loaf (white/brown)',      category: 'Snacks',  price: 45,   unit: 'piece',  stock: 50  },
  { name: 'Rusk',        description: 'Toasted bread rusk',            category: 'Snacks',  price: 40,   unit: 'packet', stock: 40  },

  // ── Personal Care & Hygiene ───────────────────────────────────────────────
  { name: 'Sabun',       description: 'Bathing soap (Lux/Dove) 100g', category: 'Personal',price: 45,   unit: 'piece',  stock: 100 },
  { name: 'Shampoo',     description: 'Shampoo sachet 5ml',            category: 'Personal',price: 3,    unit: 'piece',  stock: 200 },
  { name: 'Toothpaste',  description: 'Colgate/Dabur toothpaste 100g',category: 'Personal',price: 50,   unit: 'piece',  stock: 60  },
  { name: 'Toothbrush',  description: 'Medium/hard toothbrush',        category: 'Personal',price: 20,   unit: 'piece',  stock: 50  },
  { name: 'Hair Oil',    description: 'Coconut / Sarso hair oil',      category: 'Personal',price: 80,   unit: 'piece',  stock: 40  },
  { name: 'Cream',       description: 'Fair & Lovely / Ponds cream',   category: 'Personal',price: 60,   unit: 'piece',  stock: 40  },
  { name: 'Kum Kum',     description: 'Sindoor / vermillion powder',   category: 'Personal',price: 10,   unit: 'piece',  stock: 100 },
  { name: 'Agarbatti',   description: 'Incense sticks',                category: 'Personal',price: 20,   unit: 'packet', stock: 80  },

  // ── Cleaning & Household ──────────────────────────────────────────────────
  { name: 'Detergent',   description: 'Washing powder (Surf/Wheel) 1kg',category: 'Cleaning',price: 85, unit: 'kg',     stock: 80  },
  { name: 'Dishwash',    description: 'Vim / Pril dish wash bar/liquid',category: 'Cleaning',price: 40, unit: 'piece',  stock: 60  },
  { name: 'Phenyl',      description: 'Floor cleaner / phenyl 500ml',  category: 'Cleaning',price: 50,  unit: 'piece',  stock: 40  },
  { name: 'Matchbox',    description: 'Safety matches (10 boxes)',      category: 'Cleaning',price: 10,  unit: 'piece',  stock: 200 },
  { name: 'Camphor',     description: 'Kapur tablet (pooja/repellent)', category: 'Cleaning',price: 15,  unit: 'piece',  stock: 100 },
  { name: 'Kerosin',     description: 'Kerosene oil (mitti tel)',       category: 'Cleaning',price: 35,  unit: 'litre',  stock: 50  },

  // ── Staples & Condiments ──────────────────────────────────────────────────
  { name: 'Tomato Sauce',description: 'Kissan / Maggi ketchup 500g',  category: 'Staples', price: 80,   unit: 'piece',  stock: 30  },
  { name: 'Pickle',      description: 'Mango / mixed achar',           category: 'Staples', price: 60,   unit: 'piece',  stock: 30  },
  { name: 'Murabba',     description: 'Amla / carrot murabba',         category: 'Staples', price: 80,   unit: 'piece',  stock: 20  },
  { name: 'Sirkha',      description: 'Vinegar (white)',               category: 'Staples', price: 30,   unit: 'piece',  stock: 20  },
  { name: 'Khajoor',     description: 'Dates (khajur)',                category: 'Staples', price: 200,  unit: 'kg',     stock: 20  },
  { name: 'Kismis',      description: 'Raisins (munakka)',             category: 'Staples', price: 300,  unit: 'kg',     stock: 15  },
  { name: 'Badam',       description: 'Almonds',                       category: 'Staples', price: 800,  unit: 'kg',     stock: 10  },
  { name: 'Mungfali',    description: 'Groundnuts / peanuts',          category: 'Staples', price: 80,   unit: 'kg',     stock: 60  },
  { name: 'Til',         description: 'Sesame seeds',                  category: 'Staples', price: 150,  unit: 'kg',     stock: 25  },
  { name: 'Nariyal',     description: 'Coconut (sabut)',               category: 'Staples', price: 30,   unit: 'piece',  stock: 50  },
];

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding products for tenant: ${TENANT_ID}\n`);

  // Ensure tenant exists (bootstrap may not have run yet)
  await prisma.tenant.upsert({
    where:  { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: process.env.SHOP_NAME || 'My Kirana Store' },
  });

  // Remove placeholder products auto-created by voice commands (price = 0, category = 'General')
  const { count: removed } = await prisma.product.deleteMany({
    where: { tenantId: TENANT_ID, category: 'General', price: 0 },
  });
  if (removed > 0) console.log(`🗑  Removed ${removed} placeholder auto-created products`);

  let created = 0;
  let skipped = 0;

  for (const p of PRODUCTS) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: TENANT_ID, name: { equals: p.name, mode: 'insensitive' } },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        tenantId:    TENANT_ID,
        name:        p.name,
        description: p.description ?? null,
        category:    p.category,
        price:       new Decimal(p.price),
        unit:        p.unit,
        stock:       p.stock,
        isActive:    true,
      },
    });

    created++;
    process.stdout.write(`  ✓ ${p.name.padEnd(18)} ₹${String(p.price).padStart(5)} / ${p.unit}\n`);
  }

  console.log(`\n✅ Done — ${created} products created, ${skipped} already existed.`);
  console.log(`   Total products: ${await prisma.product.count({ where: { tenantId: TENANT_ID } })}`);
  console.log('\nNote: Customers, invoices and ledger data were NOT modified.\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
