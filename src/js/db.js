import Dexie from 'dexie';

// Initialize Dexie database with 4 stores
const db = new Dexie('stashRx');
db.version(4).stores({
  inventory: '++id,generic,brand,exp,stock',
  sales: '++id,date,total',
  expenses: '++id,date,amount,category',
  customers: 'idNumber,name'
});

// Seeded inventory data
const SEEDED_INVENTORY = [
  { generic: 'Paracetamol', brand: 'Biogesic 500mg Tab', stock: 240, price: 15.50, exp: '12/2025' },
  { generic: 'Amoxicillin', brand: 'Amoxil 500mg Cap', stock: 45, price: 45.00, exp: '08/2024' },
  { generic: 'Losartan', brand: 'Lifezar 50mg Tab', stock: 150, price: 120.00, exp: '01/2024' },
  { generic: 'Ibuprofen', brand: 'Advil 200mg Cap', stock: 300, price: 22.00, exp: '10/2026' }
];

// Seed data on first run
async function seedData() {
  try {
    const count = await db.inventory.count();
    if (count === 0) {
      await db.inventory.bulkAdd(SEEDED_INVENTORY);
      console.log('Seed data added.');
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}

export { db, SEEDED_INVENTORY, seedData };
