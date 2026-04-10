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

  // ── Demo Customers ─────────────────────────────────────────────────────────
  console.log('\n👥 Seeding demo customers...\n');

  const demoCustomers = [
    { name: 'Ramesh Kumar',   phone: '9876543210', area: 'Gandhi Nagar',   city: 'Delhi',    balance: 1450 },
    { name: 'Suresh Sharma',  phone: '9812345678', area: 'Laxmi Nagar',    city: 'Delhi',    balance: 0    },
    { name: 'Priya Verma',    phone: '9898989898', area: 'Saket',          city: 'Delhi',    balance: 720  },
    { name: 'Mohan Das',      phone: '9765432100', area: 'Karol Bagh',     city: 'Delhi',    balance: 3200 },
    { name: 'Sunita Devi',    phone: '9654321098', area: 'Rohini',         city: 'Delhi',    balance: 0    },
    { name: 'Rajesh Gupta',   phone: '9543210987', area: 'Pitampura',      city: 'Delhi',    balance: 580  },
    { name: 'Anita Singh',    phone: '9432109876', area: 'Dwarka',         city: 'Delhi',    balance: 0    },
    { name: 'Vijay Yadav',    phone: '9321098765', area: 'Janakpuri',      city: 'Delhi',    balance: 1890 },
    { name: 'Kavita Mishra',  phone: '9210987654', area: 'Uttam Nagar',    city: 'Delhi',    balance: 440  },
    { name: 'Deepak Tiwari',  phone: '9109876543', area: 'Tilak Nagar',    city: 'Delhi',    balance: 0    },
    // ── Lucknow customers ────────────────────────────────────────────────────
    { name: 'Amit Patel',         phone: '9000112233', area: 'Chowk',           city: 'Lucknow',  balance: 960  },
    { name: 'Geeta Agarwal',      phone: '9000223344', area: 'Hazratganj',      city: 'Lucknow',  balance: 0    },
    { name: 'Sunil Jain',         phone: '9000334455', area: 'Alambagh',        city: 'Lucknow',  balance: 2150 },
    { name: 'Pooja Shukla',       phone: '9000445566', area: 'Indira Nagar',    city: 'Lucknow',  balance: 320  },
    { name: 'Manoj Srivastava',   phone: '9000556677', area: 'Gomti Nagar',     city: 'Lucknow',  balance: 0    },
    // ── Agra customers ───────────────────────────────────────────────────────
    { name: 'Rakesh Pandey',      phone: '9000667788', area: 'Civil Lines',     city: 'Agra',     balance: 1700 },
    { name: 'Nirmala Bajpai',     phone: '9000778899', area: 'Taj Nagri',       city: 'Agra',     balance: 0    },
    { name: 'Santosh Yadav',      phone: '9000889900', area: 'Sikandra',        city: 'Agra',     balance: 890  },
    { name: 'Laxmi Devi',         phone: '9000990011', area: 'Sanjay Place',    city: 'Agra',     balance: 0    },
    // ── Kanpur customers ─────────────────────────────────────────────────────
    { name: 'Harish Kushwaha',    phone: '9001122334', area: 'Govind Nagar',    city: 'Kanpur',   balance: 3800 },
    { name: 'Savita Singh',       phone: '9001233445', area: 'Kidwai Nagar',    city: 'Kanpur',   balance: 560  },
    { name: 'Vinod Kumar',        phone: '9001344556', area: 'Arya Nagar',      city: 'Kanpur',   balance: 0    },
    // ── Varanasi customers ───────────────────────────────────────────────────
    { name: 'Rekha Chaudhary',    phone: '9001455667', area: 'Assi Ghat',       city: 'Varanasi', balance: 1230 },
    { name: 'Dinesh Tripathi',    phone: '9001566778', area: 'Lanka',           city: 'Varanasi', balance: 0    },
    { name: 'Meena Keshari',      phone: '9001677889', area: 'Dashashwamedh',   city: 'Varanasi', balance: 470  },
  ];

  const customerIds: Record<string, string> = {};
  let custCreated = 0;

  for (const c of demoCustomers) {
    const exists = await prisma.customer.findFirst({
      where: { tenantId: TENANT_ID, phone: c.phone },
    });
    if (exists) {
      customerIds[c.phone] = exists.id;
      continue;
    }
    const customer = await prisma.customer.create({
      data: {
        tenantId:      TENANT_ID,
        name:          c.name,
        phone:         c.phone,
        area:          c.area,
        city:          c.city,
        balance:       new Decimal(c.balance),
        totalPurchases: new Decimal(c.balance),
        visitCount:    Math.floor(Math.random() * 20) + 2,
        firstVisit:    new Date(Date.now() - 90 * 86_400_000),
        lastVisit:     new Date(Date.now() - Math.floor(Math.random() * 14) * 86_400_000),
        loyaltyTier:   c.balance > 1000 ? 'silver' : 'bronze',
      },
    });
    customerIds[c.phone] = customer.id;
    custCreated++;
    process.stdout.write(`  ✓ ${c.name.padEnd(20)} ₹${String(c.balance).padStart(5)} balance\n`);
  }
  console.log(`\n  ${custCreated} customers created.`);

  // ── Demo Invoices (outstanding balances) ───────────────────────────────────
  console.log('\n🧾 Seeding demo invoices...\n');

  const existingInvoices = await prisma.invoice.count({ where: { tenantId: TENANT_ID } });
  const invoiceIds: Record<string, string> = {};

  if (existingInvoices > 0) {
    console.log(`  Skipped — ${existingInvoices} invoices already exist.\n`);
    // Load existing IDs so payment seeding can reference them
    const existing = await prisma.invoice.findMany({
      where:  { tenantId: TENANT_ID },
      select: { id: true, invoiceNo: true },
    });
    for (const inv of existing) invoiceIds[inv.invoiceNo] = inv.id;
  } else {
    const invoiceDemos = [
      // ── Original Delhi customers ──────────────────────────────────────────
      { phone: '9876543210', daysAgo: 45, amount: 1450, paid: 0,    items: [{ name: 'Chawal', qty: 10, price: 80, unit: 'kg' }, { name: 'Arhar Dal', qty: 2, price: 130, unit: 'kg' }] },
      { phone: '9898989898', daysAgo: 12, amount: 720,  paid: 0,    items: [{ name: 'Doodh', qty: 5, price: 62, unit: 'litre' }, { name: 'Dahi', qty: 3, price: 55, unit: 'kg' }, { name: 'Anda', qty: 30, price: 7, unit: 'piece' }] },
      { phone: '9765432100', daysAgo: 72, amount: 3200, paid: 0,    items: [{ name: 'Sarso Tel', qty: 10, price: 170, unit: 'litre' }, { name: 'Aata', qty: 20, price: 40, unit: 'kg' }, { name: 'Cheeni', qty: 10, price: 45, unit: 'kg' }] },
      { phone: '9543210987', daysAgo: 8,  amount: 580,  paid: 0,    items: [{ name: 'Biscuit', qty: 5, price: 25, unit: 'packet' }, { name: 'Chai Patti', qty: 1, price: 250, unit: 'kg' }, { name: 'Namkeen', qty: 3, price: 50, unit: 'packet' }] },
      { phone: '9321098765', daysAgo: 35, amount: 1890, paid: 500,  items: [{ name: 'Detergent', qty: 5, price: 85, unit: 'kg' }, { name: 'Sabun', qty: 10, price: 45, unit: 'piece' }, { name: 'Shampoo', qty: 20, price: 3, unit: 'piece' }, { name: 'Toothpaste', qty: 5, price: 50, unit: 'piece' }] },
      { phone: '9210987654', daysAgo: 18, amount: 440,  paid: 0,    items: [{ name: 'Desi Ghee', qty: 0.5, price: 600, unit: 'kg' }, { name: 'Elaichi', qty: 0.1, price: 1200, unit: 'kg' }] },
      { phone: '9812345678', daysAgo: 20, amount: 630,  paid: 630,  items: [{ name: 'Chawal', qty: 5, price: 80, unit: 'kg' }, { name: 'Arhar Dal', qty: 2, price: 130, unit: 'kg' }, { name: 'Namak', qty: 2, price: 20, unit: 'kg' }] },
      { phone: '9654321098', daysAgo: 5,  amount: 480,  paid: 480,  items: [{ name: 'Doodh', qty: 4, price: 62, unit: 'litre' }, { name: 'Paneer', qty: 0.5, price: 320, unit: 'kg' }, { name: 'Butter', qty: 0.2, price: 550, unit: 'kg' }] },
      // ── Lucknow / Agra / Kanpur / Varanasi customers ──────────────────────
      { phone: '9000112233', daysAgo: 25, amount: 960,  paid: 0,    items: [{ name: 'Aata', qty: 10, price: 40, unit: 'kg' }, { name: 'Cheeni', qty: 5, price: 45, unit: 'kg' }, { name: 'Sarso Tel', qty: 2, price: 170, unit: 'litre' }] },
      { phone: '9000334455', daysAgo: 60, amount: 2150, paid: 0,    items: [{ name: 'Chawal', qty: 15, price: 80, unit: 'kg' }, { name: 'Arhar Dal', qty: 5, price: 130, unit: 'kg' }, { name: 'Desi Ghee', qty: 1, price: 600, unit: 'kg' }] },
      { phone: '9000445566', daysAgo: 14, amount: 320,  paid: 0,    items: [{ name: 'Doodh', qty: 3, price: 62, unit: 'litre' }, { name: 'Dahi', qty: 2, price: 55, unit: 'kg' }, { name: 'Paneer', qty: 0.3, price: 320, unit: 'kg' }] },
      { phone: '9000667788', daysAgo: 40, amount: 1700, paid: 0,    items: [{ name: 'Basmati', qty: 10, price: 120, unit: 'kg' }, { name: 'Rajma', qty: 3, price: 120, unit: 'kg' }, { name: 'Garam Masala', qty: 1, price: 300, unit: 'kg' }, { name: 'Haldi', qty: 0.5, price: 150, unit: 'kg' }] },
      { phone: '9000889900', daysAgo: 22, amount: 890,  paid: 0,    items: [{ name: 'Sunflower Tel', qty: 5, price: 140, unit: 'litre' }, { name: 'Besan', qty: 2, price: 70, unit: 'kg' }, { name: 'Gud', qty: 2, price: 60, unit: 'kg' }] },
      { phone: '9001122334', daysAgo: 30, amount: 3800, paid: 1000, items: [{ name: 'Chawal', qty: 20, price: 80, unit: 'kg' }, { name: 'Aata', qty: 25, price: 40, unit: 'kg' }, { name: 'Arhar Dal', qty: 10, price: 130, unit: 'kg' }] },
      { phone: '9001233445', daysAgo: 16, amount: 560,  paid: 0,    items: [{ name: 'Chai Patti', qty: 2, price: 250, unit: 'kg' }, { name: 'Biscuit', qty: 5, price: 25, unit: 'packet' }, { name: 'Maggi', qty: 5, price: 15, unit: 'piece' }] },
      { phone: '9001455667', daysAgo: 50, amount: 1230, paid: 0,    items: [{ name: 'Desi Ghee', qty: 1, price: 600, unit: 'kg' }, { name: 'Badam', qty: 0.5, price: 800, unit: 'kg' }, { name: 'Elaichi', qty: 0.1, price: 1200, unit: 'kg' }] },
      { phone: '9001677889', daysAgo: 10, amount: 470,  paid: 0,    items: [{ name: 'Haldi', qty: 0.5, price: 150, unit: 'kg' }, { name: 'Lal Mirchi', qty: 0.5, price: 180, unit: 'kg' }, { name: 'Dhaniya', qty: 0.5, price: 120, unit: 'kg' }, { name: 'Jeera', qty: 0.2, price: 250, unit: 'kg' }] },
      // ── Paid transaction history for zero-balance customers ───────────────
      { phone: '9000223344', daysAgo: 30, amount: 540,  paid: 540,  items: [{ name: 'Chawal', qty: 3, price: 80, unit: 'kg' }, { name: 'Arhar Dal', qty: 2, price: 130, unit: 'kg' }, { name: 'Namak', qty: 2, price: 20, unit: 'kg' }] },
      { phone: '9000556677', daysAgo: 8,  amount: 780,  paid: 780,  items: [{ name: 'Sarso Tel', qty: 3, price: 170, unit: 'litre' }, { name: 'Sunflower Tel', qty: 2, price: 140, unit: 'litre' }] },
      { phone: '9000778899', daysAgo: 12, amount: 420,  paid: 420,  items: [{ name: 'Aata', qty: 5, price: 40, unit: 'kg' }, { name: 'Cheeni', qty: 3, price: 45, unit: 'kg' }, { name: 'Namkeen', qty: 3, price: 50, unit: 'packet' }] },
      { phone: '9000990011', daysAgo: 6,  amount: 650,  paid: 650,  items: [{ name: 'Doodh', qty: 5, price: 62, unit: 'litre' }, { name: 'Dahi', qty: 3, price: 55, unit: 'kg' }, { name: 'Paneer', qty: 0.5, price: 320, unit: 'kg' }] },
      { phone: '9001344556', daysAgo: 15, amount: 390,  paid: 390,  items: [{ name: 'Detergent', qty: 2, price: 85, unit: 'kg' }, { name: 'Sabun', qty: 3, price: 45, unit: 'piece' }, { name: 'Dishwash', qty: 2, price: 40, unit: 'piece' }] },
      { phone: '9001566778', daysAgo: 20, amount: 510,  paid: 510,  items: [{ name: 'Biscuit', qty: 5, price: 25, unit: 'packet' }, { name: 'Chips', qty: 5, price: 20, unit: 'packet' }, { name: 'Coldrink', qty: 6, price: 40, unit: 'piece' }] },
    ];

    let invCreated = 0;
    for (let i = 0; i < invoiceDemos.length; i++) {
      const inv = invoiceDemos[i];
      const customerId = customerIds[inv.phone];
      if (!customerId) continue;

      const invoiceDate = new Date(Date.now() - inv.daysAgo * 86_400_000);
      const invoiceNo   = `INV-DEMO-${String(i + 1).padStart(3, '0')}`;
      const status      = inv.paid >= inv.amount ? 'paid' : inv.paid > 0 ? 'partial' : 'pending';

      const created = await prisma.invoice.create({
        data: {
          tenantId:      TENANT_ID,
          invoiceNo,
          customerId,
          subtotal:      new Decimal(inv.amount),
          total:         new Decimal(inv.amount),
          paidAmount:    new Decimal(inv.paid),
          status:        status as any,
          paymentMethod: inv.paid > 0 ? 'cash' : null,
          invoiceDate,
          paidAt:        inv.paid >= inv.amount ? invoiceDate : null,
          items: {
            create: inv.items.map(item => ({
              productName: item.name,
              quantity:    new Decimal(item.qty),
              unit:        item.unit,
              unitPrice:   new Decimal(item.price),
              subtotal:    new Decimal(item.qty * item.price),
              total:       new Decimal(item.qty * item.price),
            })),
          },
        },
      });

      invoiceIds[invoiceNo] = created.id;
      invCreated++;
      process.stdout.write(`  ✓ ${invoiceNo}  ₹${inv.amount} [${status}]  ${inv.daysAgo}d ago\n`);
    }
    console.log(`\n  ${invCreated} invoices created.\n`);
  }

  // ── Invoice Counter ──────────────────────────────────────────────────────────
  console.log('🔢 Seeding invoice counter...\n');
  const totalInvoices = await prisma.invoice.count({ where: { tenantId: TENANT_ID } });
  await prisma.invoiceCounter.upsert({
    where:  { fy_tenantId: { fy: '2025-26', tenantId: TENANT_ID } },
    update: {},
    create: { fy: '2025-26', tenantId: TENANT_ID, lastSeq: totalInvoices },
  });
  console.log(`  ✓ Invoice counter: 2025-26 → lastSeq ${totalInvoices}\n`);

  // ── Payments ─────────────────────────────────────────────────────────────────
  console.log('💰 Seeding payments...\n');
  const existingPayments = await prisma.payment.count({ where: { tenantId: TENANT_ID } });
  if (existingPayments > 0) {
    console.log(`  Skipped — ${existingPayments} payments already exist.\n`);
  } else {
    const paidInvoices = await prisma.invoice.findMany({
      where: { tenantId: TENANT_ID, status: { in: ['paid', 'partial'] as any[] } },
    });
    let payCreated = 0;
    for (const inv of paidInvoices) {
      if (!inv.customerId || Number(inv.paidAmount) === 0) continue;
      const method = Number(inv.paidAmount) > 1000 ? 'upi' : 'cash';
      await prisma.payment.create({
        data: {
          tenantId:   TENANT_ID,
          paymentNo:  `PAY-DEMO-${String(payCreated + 1).padStart(3, '0')}`,
          customerId: inv.customerId,
          invoiceId:  inv.id,
          amount:     inv.paidAmount,
          method:     method as any,
          status:     'completed' as any,
          receivedAt: inv.invoiceDate,
          notes:      'Demo payment',
        },
      });
      payCreated++;
    }
    console.log(`  ${payCreated} payments created.\n`);
  }

  // ── Suppliers ────────────────────────────────────────────────────────────────
  console.log('🏭 Seeding suppliers...\n');
  const existingSuppliers = await prisma.supplier.count({ where: { tenantId: TENANT_ID } });
  if (existingSuppliers > 0) {
    console.log(`  Skipped — ${existingSuppliers} suppliers already exist.\n`);
  } else {
    const supplierDemos = [
      { name: 'Agarwal Grain Traders',      companyName: 'Agarwal Traders Pvt Ltd',   phone: '9911223344', paymentTerms: 'Net 30', creditLimit: 50000 },
      { name: 'Shree Ram Kirana Wholesale', companyName: 'Shree Ram Enterprises',      phone: '9922334455', paymentTerms: 'Net 15', creditLimit: 30000 },
      { name: 'Delhi Masala & Spice Co.',   companyName: 'Delhi Masala House',         phone: '9933445566', paymentTerms: 'Advance', creditLimit: 20000 },
      { name: 'Amul Dairy Distributor',     companyName: 'Amul Regional Office',       phone: '9944556677', paymentTerms: 'Net 7',  creditLimit: 40000 },
      { name: 'National Beverages Dist.',   companyName: 'National Beverages Ltd',     phone: '9955667788', paymentTerms: 'Net 15', creditLimit: 25000 },
      { name: 'Gujarat Edible Oil Mills',   companyName: 'Gujarat Oil Mills Pvt Ltd',  phone: '9966778899', paymentTerms: 'Net 30', creditLimit: 60000 },
    ];

    const supplierIds: Record<string, string> = {};
    let supCreated = 0;
    for (const s of supplierDemos) {
      const sup = await prisma.supplier.create({
        data: {
          tenantId:     TENANT_ID,
          name:         s.name,
          companyName:  s.companyName,
          phone:        s.phone,
          paymentTerms: s.paymentTerms,
          creditLimit:  new Decimal(s.creditLimit),
          balance:      new Decimal(0),
        },
      });
      supplierIds[s.name] = sup.id;
      supCreated++;
      process.stdout.write(`  ✓ ${s.name}\n`);
    }
    console.log(`\n  ${supCreated} suppliers created.\n`);

    // ── Purchase Orders ──────────────────────────────────────────────────────
    console.log('📦 Seeding purchase orders...\n');

    const productMap: Record<string, string> = {};
    const allProducts = await prisma.product.findMany({
      where:  { tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    for (const p of allProducts) productMap[p.name] = p.id;

    const poDemos = [
      {
        poNo: 'PO-DEMO-001', supplier: 'Agarwal Grain Traders', daysAgo: 30, status: 'received',
        items: [
          { name: 'Chawal',    qty: 100, price: 70  },
          { name: 'Arhar Dal', qty: 50,  price: 115 },
          { name: 'Aata',      qty: 100, price: 35  },
        ],
      },
      {
        poNo: 'PO-DEMO-002', supplier: 'Delhi Masala & Spice Co.', daysAgo: 20, status: 'received',
        items: [
          { name: 'Haldi',      qty: 20, price: 130 },
          { name: 'Lal Mirchi', qty: 15, price: 160 },
          { name: 'Jeera',      qty: 10, price: 220 },
          { name: 'Dhaniya',    qty: 15, price: 105 },
        ],
      },
      {
        poNo: 'PO-DEMO-003', supplier: 'National Beverages Dist.', daysAgo: 7, status: 'received',
        items: [
          { name: 'Chai Patti', qty: 20, price: 220 },
          { name: 'Coldrink',   qty: 24, price: 32  },
          { name: 'Paani',      qty: 48, price: 15  },
        ],
      },
      {
        poNo: 'PO-DEMO-004', supplier: 'Gujarat Edible Oil Mills', daysAgo: 3, status: 'pending',
        items: [
          { name: 'Sarso Tel',     qty: 40, price: 148 },
          { name: 'Sunflower Tel', qty: 40, price: 122 },
          { name: 'Coconut Oil',   qty: 20, price: 175 },
        ],
      },
    ];

    let poCreated = 0;
    for (const po of poDemos) {
      const total = po.items.reduce((sum, item) => sum + item.qty * item.price, 0);
      const orderDate = new Date(Date.now() - po.daysAgo * 86_400_000);
      await prisma.purchaseOrder.create({
        data: {
          tenantId:     TENANT_ID,
          poNo:         po.poNo,
          supplierId:   supplierIds[po.supplier],
          orderDate,
          receivedDate: po.status === 'received' ? orderDate : null,
          subtotal:     new Decimal(total),
          total:        new Decimal(total),
          status:       po.status,
          items: {
            create: po.items
              .filter(item => productMap[item.name])
              .map(item => ({
                productId:        productMap[item.name],
                quantity:         item.qty,
                receivedQuantity: po.status === 'received' ? item.qty : 0,
                unitPrice:        new Decimal(item.price),
                total:            new Decimal(item.qty * item.price),
              })),
          },
        },
      });
      poCreated++;
      process.stdout.write(`  ✓ ${po.poNo}  ${po.supplier}  ₹${total} [${po.status}]\n`);
    }
    console.log(`\n  ${poCreated} purchase orders created.\n`);
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────
  console.log('💸 Seeding expenses...\n');
  const existingExpenses = await prisma.expense.count({ where: { tenantId: TENANT_ID } });
  if (existingExpenses > 0) {
    console.log(`  Skipped — ${existingExpenses} expenses already exist.\n`);
  } else {
    const now = Date.now();
    const expenseDemos = [
      // ── Current month ──────────────────────────────────────────────────────
      { category: 'Rent',              amount: 15000, daysAgo: 1,  note: 'Shop rent — April 2026'           },
      { category: 'Utilities',         amount: 2400,  daysAgo: 3,  note: 'Electricity bill — April 2026'    },
      { category: 'Salary',            amount: 8000,  daysAgo: 1,  note: 'Staff salary — April 2026'        },
      { category: 'Packaging',         amount: 750,   daysAgo: 5,  note: 'Carry bags and packing materials' },
      { category: 'Communication',     amount: 299,   daysAgo: 7,  note: 'Business mobile recharge'         },
      // ── Last month ─────────────────────────────────────────────────────────
      { category: 'Rent',              amount: 15000, daysAgo: 31, note: 'Shop rent — March 2026'           },
      { category: 'Utilities',         amount: 2800,  daysAgo: 33, note: 'Electricity bill — March 2026'    },
      { category: 'Salary',            amount: 8000,  daysAgo: 31, note: 'Staff salary — March 2026'        },
      { category: 'Maintenance',       amount: 1200,  daysAgo: 28, note: 'Refrigerator repair'              },
      { category: 'Professional Fees', amount: 2000,  daysAgo: 35, note: 'Accountant monthly fees'          },
      // ── Two months ago ─────────────────────────────────────────────────────
      { category: 'Rent',              amount: 15000, daysAgo: 61, note: 'Shop rent — February 2026'        },
      { category: 'Utilities',         amount: 2200,  daysAgo: 63, note: 'Electricity bill — February 2026' },
      { category: 'Salary',            amount: 8000,  daysAgo: 61, note: 'Staff salary — February 2026'     },
      { category: 'Packaging',         amount: 600,   daysAgo: 55, note: 'Polythene bags wholesale'         },
      { category: 'Miscellaneous',     amount: 450,   daysAgo: 50, note: 'Stationary and office supplies'   },
    ];

    let expCreated = 0;
    for (const e of expenseDemos) {
      await prisma.expense.create({
        data: {
          tenantId: TENANT_ID,
          category: e.category,
          amount:   new Decimal(e.amount),
          note:     e.note,
          type:     'expense',
          date:     new Date(now - e.daysAgo * 86_400_000),
        },
      });
      expCreated++;
    }
    console.log(`  ${expCreated} expenses created.\n`);
  }

  // ── Message Templates ─────────────────────────────────────────────────────────
  console.log('📝 Seeding message templates...\n');
  const existingTemplates = await prisma.messageTemplate.count({ where: { tenantId: TENANT_ID } });
  if (existingTemplates > 0) {
    console.log(`  Skipped — ${existingTemplates} templates already exist.\n`);
  } else {
    const templateDemos = [
      {
        templateCode: 'payment_due_reminder',
        templateName: 'Payment Due Reminder',
        channel: 'whatsapp' as const,
        language: 'hi',
        content: 'Namaste {{customerName}} ji 🙏\n\nAapka hamare yahan ₹{{amount}} baaki hai.\n\nInvoice No: {{invoiceNo}}\n\nKripaya jaldi bhugtaan karein.\n\nDhanyawad!\n{{shopName}}',
        requiredVariables: ['customerName', 'amount', 'invoiceNo', 'shopName'],
      },
      {
        templateCode: 'payment_received',
        templateName: 'Payment Received',
        channel: 'whatsapp' as const,
        language: 'hi',
        content: 'Namaste {{customerName}} ji 🙏\n\n✅ Aapka ₹{{amount}} ka bhugtaan prapt ho gaya.\n\nReceipt No: {{paymentNo}}\nDate: {{date}}\n\nShukriya!\n{{shopName}}',
        requiredVariables: ['customerName', 'amount', 'paymentNo', 'date', 'shopName'],
      },
      {
        templateCode: 'new_invoice',
        templateName: 'New Invoice Created',
        channel: 'whatsapp' as const,
        language: 'hi',
        content: 'Namaste {{customerName}} ji 🙏\n\nAapka bill taiyaar hai.\n\nBill No: {{invoiceNo}}\nKul Rakam: ₹{{amount}}\nDate: {{date}}\n\nDhanyawad!',
        requiredVariables: ['customerName', 'invoiceNo', 'amount', 'date'],
      },
      {
        templateCode: 'bulk_due_reminder',
        templateName: 'Bulk Due Reminder (SMS)',
        channel: 'sms' as const,
        language: 'en',
        content: 'Dear {{customerName}}, outstanding balance of Rs.{{amount}} is due. Please pay at {{shopName}}. Contact: {{phone}}',
        requiredVariables: ['customerName', 'amount', 'shopName', 'phone'],
      },
    ];

    let tmplCreated = 0;
    for (const t of templateDemos) {
      await prisma.messageTemplate.create({
        data: {
          tenantId:          TENANT_ID,
          templateCode:      t.templateCode,
          templateName:      t.templateName,
          channel:           t.channel as any,
          language:          t.language,
          content:           t.content,
          requiredVariables: t.requiredVariables,
          isActive:          true,
        },
      });
      process.stdout.write(`  ✓ ${t.templateName} (${t.channel}/${t.language})\n`);
      tmplCreated++;
    }
    console.log(`\n  ${tmplCreated} message templates created.\n`);
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
