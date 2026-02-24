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
  hsnCode?: string;   // Indian HSN code
  gstRate?: number;   // GST % (0 | 5 | 12 | 18 | 28)
  isGstExempt?: boolean; // true for nil-rated / exempt goods
}

const PRODUCTS: ProductSeed[] = [
  // ── Grains & Flour — 0% GST (unbranded/unpackaged) ──────────────────────
  { name: 'Aata',        description: 'Gehun aata (wheat flour)',      category: 'Grains',  price: 40,   unit: 'kg',     stock: 200, hsnCode: '1102', gstRate: 0,  isGstExempt: true  },
  { name: 'Maida',       description: 'Refined wheat flour',           category: 'Grains',  price: 38,   unit: 'kg',     stock: 100, hsnCode: '1102', gstRate: 0,  isGstExempt: true  },
  { name: 'Besan',       description: 'Chickpea flour',                category: 'Grains',  price: 70,   unit: 'kg',     stock: 80,  hsnCode: '1102', gstRate: 0,  isGstExempt: true  },
  { name: 'Suji',        description: 'Semolina / Rawa',               category: 'Grains',  price: 45,   unit: 'kg',     stock: 60,  hsnCode: '1103', gstRate: 0,  isGstExempt: true  },
  { name: 'Chawal',      description: 'Basmati rice (medium grain)',   category: 'Grains',  price: 80,   unit: 'kg',     stock: 300, hsnCode: '1006', gstRate: 0,  isGstExempt: true  },
  { name: 'Basmati',     description: 'Premium basmati rice',          category: 'Grains',  price: 120,  unit: 'kg',     stock: 100, hsnCode: '1006', gstRate: 5  },
  { name: 'Poha',        description: 'Flattened rice (chiwda)',       category: 'Grains',  price: 55,   unit: 'kg',     stock: 50,  hsnCode: '1104', gstRate: 0,  isGstExempt: true  },
  { name: 'Dalia',       description: 'Broken wheat porridge',         category: 'Grains',  price: 48,   unit: 'kg',     stock: 40,  hsnCode: '1104', gstRate: 0,  isGstExempt: true  },
  { name: 'Sattu',       description: 'Roasted gram flour',            category: 'Grains',  price: 80,   unit: 'kg',     stock: 30,  hsnCode: '1102', gstRate: 0,  isGstExempt: true  },
  { name: 'Cornflour',   description: 'Corn starch powder',            category: 'Grains',  price: 70,   unit: 'kg',     stock: 30,  hsnCode: '1108', gstRate: 5  },

  // ── Pulses (Dal) — 0% GST ────────────────────────────────────────────────
  { name: 'Arhar Dal',   description: 'Toor dal / pigeon pea',         category: 'Dal',     price: 130,  unit: 'kg',     stock: 100, hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Chana Dal',   description: 'Split Bengal gram',             category: 'Dal',     price: 90,   unit: 'kg',     stock: 80,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Moong Dal',   description: 'Split green gram (dhuli)',      category: 'Dal',     price: 110,  unit: 'kg',     stock: 80,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Urad Dal',    description: 'Black lentil split',            category: 'Dal',     price: 100,  unit: 'kg',     stock: 70,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Masoor Dal',  description: 'Red lentil dal',                category: 'Dal',     price: 90,   unit: 'kg',     stock: 80,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Rajma',       description: 'Kidney beans',                  category: 'Dal',     price: 120,  unit: 'kg',     stock: 60,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Chana',       description: 'Whole Bengal gram (kala chana)',category: 'Dal',     price: 80,   unit: 'kg',     stock: 80,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },
  { name: 'Matar',       description: 'Dried green peas',              category: 'Dal',     price: 70,   unit: 'kg',     stock: 60,  hsnCode: '0713', gstRate: 0,  isGstExempt: true  },

  // ── Sugar, Salt & Sweeteners ──────────────────────────────────────────────
  { name: 'Cheeni',      description: 'White sugar (chini)',           category: 'Sugar',   price: 45,   unit: 'kg',     stock: 200, hsnCode: '1701', gstRate: 5  },
  { name: 'Shakkar',     description: 'Khandsari / brown sugar',       category: 'Sugar',   price: 50,   unit: 'kg',     stock: 80,  hsnCode: '1702', gstRate: 5  },
  { name: 'Gud',         description: 'Jaggery (gur)',                 category: 'Sugar',   price: 60,   unit: 'kg',     stock: 50,  hsnCode: '1702', gstRate: 5  },
  { name: 'Namak',       description: 'Salt (iodised)',                category: 'Sugar',   price: 20,   unit: 'kg',     stock: 150, hsnCode: '2501', gstRate: 0,  isGstExempt: true  },
  { name: 'Sendha Namak',description: 'Rock salt (pink salt)',         category: 'Sugar',   price: 35,   unit: 'kg',     stock: 40,  hsnCode: '2501', gstRate: 0,  isGstExempt: true  },

  // ── Oils & Fats ───────────────────────────────────────────────────────────
  { name: 'Sarso Tel',   description: 'Mustard oil (kachi ghani)',     category: 'Oil',     price: 170,  unit: 'litre',  stock: 80,  hsnCode: '1514', gstRate: 5  },
  { name: 'Sunflower Tel', description: 'Refined sunflower oil',       category: 'Oil',     price: 140,  unit: 'litre',  stock: 80,  hsnCode: '1512', gstRate: 5  },
  { name: 'Soyabean Tel', description: 'Soyabean refined oil',        category: 'Oil',     price: 130,  unit: 'litre',  stock: 60,  hsnCode: '1507', gstRate: 5  },
  { name: 'Desi Ghee',   description: 'Pure desi ghee',               category: 'Oil',     price: 600,  unit: 'kg',     stock: 30,  hsnCode: '0405', gstRate: 12 },
  { name: 'Vanaspati',   description: 'Dalda / hydrogenated fat',      category: 'Oil',     price: 120,  unit: 'kg',     stock: 40,  hsnCode: '1516', gstRate: 5  },
  { name: 'Coconut Oil', description: 'Naariyal tel',                  category: 'Oil',     price: 200,  unit: 'litre',  stock: 30,  hsnCode: '1513', gstRate: 5  },

  // ── Spices (Masala) — 5% GST ─────────────────────────────────────────────
  { name: 'Haldi',       description: 'Turmeric powder',              category: 'Masala',  price: 150,  unit: 'kg',     stock: 50,  hsnCode: '0910', gstRate: 5  },
  { name: 'Lal Mirchi',  description: 'Red chilli powder',            category: 'Masala',  price: 180,  unit: 'kg',     stock: 40,  hsnCode: '0904', gstRate: 5  },
  { name: 'Dhaniya',     description: 'Coriander powder',             category: 'Masala',  price: 120,  unit: 'kg',     stock: 50,  hsnCode: '0909', gstRate: 5  },
  { name: 'Jeera',       description: 'Cumin seeds / powder',         category: 'Masala',  price: 250,  unit: 'kg',     stock: 30,  hsnCode: '0909', gstRate: 5  },
  { name: 'Garam Masala',description: 'Mixed spice powder',           category: 'Masala',  price: 300,  unit: 'kg',     stock: 25,  hsnCode: '0910', gstRate: 5  },
  { name: 'Ajwain',      description: 'Carom seeds (bishop weed)',     category: 'Masala',  price: 200,  unit: 'kg',     stock: 20,  hsnCode: '0909', gstRate: 5  },
  { name: 'Saunf',       description: 'Fennel seeds (mukhwas)',        category: 'Masala',  price: 180,  unit: 'kg',     stock: 20,  hsnCode: '0909', gstRate: 5  },
  { name: 'Kali Mirch',  description: 'Black pepper (sabut/powder)',   category: 'Masala',  price: 400,  unit: 'kg',     stock: 15,  hsnCode: '0904', gstRate: 5  },
  { name: 'Lavang',      description: 'Cloves (long)',                 category: 'Masala',  price: 800,  unit: 'kg',     stock: 10,  hsnCode: '0907', gstRate: 5  },
  { name: 'Elaichi',     description: 'Green cardamom (choti)',        category: 'Masala',  price: 1200, unit: 'kg',     stock: 10,  hsnCode: '0908', gstRate: 5  },
  { name: 'Dalchini',    description: 'Cinnamon bark',                category: 'Masala',  price: 600,  unit: 'kg',     stock: 10,  hsnCode: '0906', gstRate: 5  },
  { name: 'Amchur',      description: 'Dry mango powder',             category: 'Masala',  price: 200,  unit: 'kg',     stock: 20,  hsnCode: '0910', gstRate: 5  },
  { name: 'Imli',        description: 'Tamarind (seedless)',           category: 'Masala',  price: 100,  unit: 'kg',     stock: 25,  hsnCode: '0813', gstRate: 5  },
  { name: 'Chaat Masala',description: 'Tangy chaat spice mix',        category: 'Masala',  price: 250,  unit: 'kg',     stock: 20,  hsnCode: '0910', gstRate: 5  },

  // ── Dairy & Eggs ──────────────────────────────────────────────────────────
  { name: 'Doodh',       description: 'Full cream milk',              category: 'Dairy',   price: 62,   unit: 'litre',  stock: 100, hsnCode: '0401', gstRate: 0,  isGstExempt: true  },
  { name: 'Dahi',        description: 'Fresh curd / yoghurt',         category: 'Dairy',   price: 55,   unit: 'kg',     stock: 60,  hsnCode: '0403', gstRate: 5  },
  { name: 'Paneer',      description: 'Cottage cheese',               category: 'Dairy',   price: 320,  unit: 'kg',     stock: 20,  hsnCode: '0406', gstRate: 5  },
  { name: 'Butter',      description: 'White butter / Amul butter',   category: 'Dairy',   price: 550,  unit: 'kg',     stock: 15,  hsnCode: '0405', gstRate: 12 },
  { name: 'Khoya',       description: 'Mawa / dried milk solids',     category: 'Dairy',   price: 320,  unit: 'kg',     stock: 10,  hsnCode: '0406', gstRate: 5  },
  { name: 'Anda',        description: 'Eggs (dozen)',                  category: 'Dairy',   price: 7,    unit: 'piece',  stock: 300, hsnCode: '0407', gstRate: 0,  isGstExempt: true  },
  { name: 'Malai',       description: 'Fresh cream (thick malai)',     category: 'Dairy',   price: 80,   unit: 'kg',     stock: 20,  hsnCode: '0401', gstRate: 5  },

  // ── Tea, Coffee & Beverages ───────────────────────────────────────────────
  { name: 'Chai Patti',  description: 'Tea leaves (dust/CTC)',        category: 'Beverage',price: 250,  unit: 'kg',     stock: 50,  hsnCode: '0902', gstRate: 5  },
  { name: 'Coffee',      description: 'Instant coffee powder',         category: 'Beverage',price: 300,  unit: 'kg',     stock: 20,  hsnCode: '0901', gstRate: 5  },
  { name: 'Horlicks',    description: 'Health drink powder',           category: 'Beverage',price: 360,  unit: 'kg',     stock: 15,  hsnCode: '1901', gstRate: 18 },
  { name: 'Bournvita',   description: 'Cocoa health drink',            category: 'Beverage',price: 380,  unit: 'kg',     stock: 10,  hsnCode: '1901', gstRate: 18 },
  { name: 'Coldrink',    description: 'Cold drink / soda bottle',      category: 'Beverage',price: 40,   unit: 'piece',  stock: 100, hsnCode: '2202', gstRate: 28 },
  { name: 'Paani',       description: 'Packaged drinking water 1L',    category: 'Beverage',price: 20,   unit: 'piece',  stock: 200, hsnCode: '2201', gstRate: 12 },

  // ── Biscuits, Snacks & Packaged Food ─────────────────────────────────────
  { name: 'Biscuit',     description: 'Parle-G / Marie biscuit 250g', category: 'Snacks',  price: 25,   unit: 'packet', stock: 150, hsnCode: '1905', gstRate: 18 },
  { name: 'Namkeen',     description: 'Salted mixture / bhujia',       category: 'Snacks',  price: 50,   unit: 'packet', stock: 80,  hsnCode: '2106', gstRate: 12 },
  { name: 'Chips',       description: 'Potato chips (Lays/Uncle)',     category: 'Snacks',  price: 20,   unit: 'packet', stock: 100, hsnCode: '2106', gstRate: 12 },
  { name: 'Papad',       description: 'Urad dal papad',                category: 'Snacks',  price: 80,   unit: 'packet', stock: 40,  hsnCode: '2106', gstRate: 5  },
  { name: 'Sewai',       description: 'Vermicelli (seviyan)',          category: 'Snacks',  price: 40,   unit: 'packet', stock: 40,  hsnCode: '1902', gstRate: 12 },
  { name: 'Maggi',       description: 'Instant noodles Maggi 70g',    category: 'Snacks',  price: 15,   unit: 'piece',  stock: 100, hsnCode: '1902', gstRate: 18 },
  { name: 'Bread',       description: 'Bread loaf (white/brown)',      category: 'Snacks',  price: 45,   unit: 'piece',  stock: 50,  hsnCode: '1905', gstRate: 0,  isGstExempt: true  },
  { name: 'Rusk',        description: 'Toasted bread rusk',            category: 'Snacks',  price: 40,   unit: 'packet', stock: 40,  hsnCode: '1905', gstRate: 5  },

  // ── Personal Care & Hygiene — 18% GST ────────────────────────────────────
  { name: 'Sabun',       description: 'Bathing soap (Lux/Dove) 100g', category: 'Personal',price: 45,   unit: 'piece',  stock: 100, hsnCode: '3401', gstRate: 18 },
  { name: 'Shampoo',     description: 'Shampoo sachet 5ml',            category: 'Personal',price: 3,    unit: 'piece',  stock: 200, hsnCode: '3305', gstRate: 18 },
  { name: 'Toothpaste',  description: 'Colgate/Dabur toothpaste 100g',category: 'Personal',price: 50,   unit: 'piece',  stock: 60,  hsnCode: '3306', gstRate: 18 },
  { name: 'Toothbrush',  description: 'Medium/hard toothbrush',        category: 'Personal',price: 20,   unit: 'piece',  stock: 50,  hsnCode: '9603', gstRate: 18 },
  { name: 'Hair Oil',    description: 'Coconut / Sarso hair oil',      category: 'Personal',price: 80,   unit: 'piece',  stock: 40,  hsnCode: '3305', gstRate: 18 },
  { name: 'Cream',       description: 'Fair & Lovely / Ponds cream',   category: 'Personal',price: 60,   unit: 'piece',  stock: 40,  hsnCode: '3304', gstRate: 18 },
  { name: 'Kum Kum',     description: 'Sindoor / vermillion powder',   category: 'Personal',price: 10,   unit: 'piece',  stock: 100, hsnCode: '3304', gstRate: 12 },
  { name: 'Agarbatti',   description: 'Incense sticks',                category: 'Personal',price: 20,   unit: 'packet', stock: 80,  hsnCode: '3307', gstRate: 12 },

  // ── Cleaning & Household ──────────────────────────────────────────────────
  { name: 'Detergent',   description: 'Washing powder (Surf/Wheel) 1kg',category: 'Cleaning',price: 85, unit: 'kg',     stock: 80,  hsnCode: '3402', gstRate: 18 },
  { name: 'Dishwash',    description: 'Vim / Pril dish wash bar/liquid',category: 'Cleaning',price: 40, unit: 'piece',  stock: 60,  hsnCode: '3401', gstRate: 18 },
  { name: 'Phenyl',      description: 'Floor cleaner / phenyl 500ml',  category: 'Cleaning',price: 50,  unit: 'piece',  stock: 40,  hsnCode: '3808', gstRate: 18 },
  { name: 'Matchbox',    description: 'Safety matches (10 boxes)',      category: 'Cleaning',price: 10,  unit: 'piece',  stock: 200, hsnCode: '3605', gstRate: 12 },
  { name: 'Camphor',     description: 'Kapur tablet (pooja/repellent)', category: 'Cleaning',price: 15,  unit: 'piece',  stock: 100, hsnCode: '2914', gstRate: 18 },
  { name: 'Kerosin',     description: 'Kerosene oil (mitti tel)',       category: 'Cleaning',price: 35,  unit: 'litre',  stock: 50,  hsnCode: '2710', gstRate: 5  },

  // ── Staples & Condiments ──────────────────────────────────────────────────
  { name: 'Tomato Sauce',description: 'Kissan / Maggi ketchup 500g',  category: 'Staples', price: 80,   unit: 'piece',  stock: 30,  hsnCode: '2103', gstRate: 12 },
  { name: 'Pickle',      description: 'Mango / mixed achar',           category: 'Staples', price: 60,   unit: 'piece',  stock: 30,  hsnCode: '2001', gstRate: 12 },
  { name: 'Murabba',     description: 'Amla / carrot murabba',         category: 'Staples', price: 80,   unit: 'piece',  stock: 20,  hsnCode: '2007', gstRate: 12 },
  { name: 'Sirkha',      description: 'Vinegar (white)',               category: 'Staples', price: 30,   unit: 'piece',  stock: 20,  hsnCode: '2209', gstRate: 12 },
  { name: 'Khajoor',     description: 'Dates (khajur)',                category: 'Staples', price: 200,  unit: 'kg',     stock: 20,  hsnCode: '0803', gstRate: 0,  isGstExempt: true  },
  { name: 'Kismis',      description: 'Raisins (munakka)',             category: 'Staples', price: 300,  unit: 'kg',     stock: 15,  hsnCode: '0806', gstRate: 5  },
  { name: 'Badam',       description: 'Almonds',                       category: 'Staples', price: 800,  unit: 'kg',     stock: 10,  hsnCode: '0802', gstRate: 5  },
  { name: 'Mungfali',    description: 'Groundnuts / peanuts',          category: 'Staples', price: 80,   unit: 'kg',     stock: 60,  hsnCode: '1202', gstRate: 5  },
  { name: 'Til',         description: 'Sesame seeds',                  category: 'Staples', price: 150,  unit: 'kg',     stock: 25,  hsnCode: '1207', gstRate: 5  },
  { name: 'Nariyal',     description: 'Coconut (sabut)',               category: 'Staples', price: 30,   unit: 'piece',  stock: 50,  hsnCode: '0801', gstRate: 0,  isGstExempt: true  },
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

    const gstData = {
      hsnCode:     p.hsnCode     ?? null,
      gstRate:     new Decimal(p.gstRate     ?? 0),
      isGstExempt: p.isGstExempt ?? false,
    };

    if (exists) {
      // Update GST fields on existing products so re-running seed fills missing data
      await prisma.product.update({
        where: { id: exists.id },
        data:  gstData,
      });
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
        ...gstData,
      },
    });

    created++;
    const gstLabel = p.isGstExempt ? 'Exempt' : `GST ${p.gstRate ?? 0}%`;
    process.stdout.write(`  ✓ ${p.name.padEnd(18)} ₹${String(p.price).padStart(5)} / ${p.unit.padEnd(7)} [${gstLabel}]\n`);
  }

  console.log(`\n✅ Done — ${created} products created, ${skipped} updated with GST data.`);
  console.log(`   Total products: ${await prisma.product.count({ where: { tenantId: TENANT_ID } })}`);
  console.log('\nNote: Customers, invoices and ledger data were NOT modified.\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
