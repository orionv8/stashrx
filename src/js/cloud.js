// Cloud sync, import/export, legal
import { db } from './db.js';
import { iosAlert, iosConfirm } from './utils.js';
import { getDeviceID, isPremium } from './license.js';
import { loadInventory, renderInventoryStatus } from './inventory.js';
import { renderExpenses } from './expenses.js';
import * as XLSX from 'xlsx';

// --- Export ---
async function exportData() {
  try {
    const inventory = await db.inventory.toArray();
    const sales = await db.sales.toArray();
    const expenses = await db.expenses.toArray();
    const customers = await db.customers.toArray();

    const wb = XLSX.utils.book_new();

    const sanitize = (arr) => arr.map(item => {
      const clean = { ...item };
      delete clean.id;
      // Serialize nested objects
      if (clean.items && typeof clean.items === 'object') clean.items = JSON.stringify(clean.items);
      if (clean.discountDetails && typeof clean.discountDetails === 'object') clean.discountDetails = JSON.stringify(clean.discountDetails);
      return clean;
    });

    const ws1 = XLSX.utils.json_to_sheet(sanitize(inventory));
    XLSX.utils.book_append_sheet(wb, ws1, 'inventory');

    const ws2 = XLSX.utils.json_to_sheet(sanitize(sales));
    XLSX.utils.book_append_sheet(wb, ws2, 'sales');

    const ws3 = XLSX.utils.json_to_sheet(sanitize(expenses));
    XLSX.utils.book_append_sheet(wb, ws3, 'expenses');

    const ws4 = XLSX.utils.json_to_sheet(sanitize(customers));
    XLSX.utils.book_append_sheet(wb, ws4, 'customers');

    XLSX.writeFile(wb, `stashrx_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
    iosAlert('Data exported successfully!', 'Export');
  } catch (e) {
    console.error('Export error:', e);
    iosAlert('Export failed: ' + e.message, 'Error');
  }
}

// --- Import ---
function getSheetCaseInsensitive(wb, name) {
  return wb.SheetNames.find(sn => sn.toLowerCase() === name.toLowerCase());
}

async function handleImport(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    const importTable = async (sheetName, dbTable, transform) => {
      const sn = getSheetCaseInsensitive(wb, sheetName);
      if (!sn) return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' });
      if (rows.length === 0) return;

      const transformed = rows.map(transform);
      await dbTable.clear();
      await dbTable.bulkAdd(transformed);
    };

    await importTable('inventory', db.inventory, row => ({
      generic: row.generic || row.Generic || row.GENERIC || '',
      brand: row.brand || row.Brand || row.BRAND || '',
      stock: parseInt(row.stock || row.Stock || row.STOCK || 0),
      price: parseFloat(row.price || row.Price || row.PRICE || 0),
      exp: row.exp || row.Expiry || row.EXP || row.Exp || ''
    }));

    await importTable('sales', db.sales, row => ({
      date: row.date || row.Date || row.DATE || new Date().toISOString(),
      total: parseFloat(row.total || row.Total || row.TOTAL || 0),
      subtotal: parseFloat(row.subtotal || row.Subtotal || 0),
      method: row.method || row.Method || 'Cash',
      pwdDiscounted: !!row.pwdDiscounted,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    }));

    await importTable('expenses', db.expenses, row => ({
      date: row.date || row.Date || row.DATE || new Date().toISOString(),
      category: row.category || row.Category || 'Other',
      description: row.description || row.Description || '',
      amount: parseFloat(row.amount || row.Amount || 0)
    }));

    await importTable('customers', db.customers, row => ({
      idNumber: row.idNumber || row.IDNumber || row.idnumber || '',
      name: row.name || row.Name || row.NAME || ''
    }));

    await loadInventory();
    await renderInventoryStatus();
    renderExpenses();
    iosAlert('Import completed successfully!', 'Import');
  } catch (e) {
    console.error('Import error:', e);
    iosAlert('Import failed: ' + e.message, 'Error');
  }
}

// --- Firebase dynamic loader ---
function getFirebaseConfig() {
  return {
    apiKey: "AIzaSy...wIgU",
    authDomain: "stashrx-63954.firebaseapp.com",
    projectId: "stashrx-63954",
    storageBucket: "stashrx-63954.firebasestorage.app",
    messagingSenderId: "562975520594",
    appId: "1:562975520594:web:0bda97f8cbea65c3af4aa5"
  };
}

async function loadFirebase() {
  if (window.__firebaseLoaded) return window.__firebaseModules;
  // Load Firebase compat scripts dynamically
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.1.0/firebase-auth-compat.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.1.0/firebase-storage-compat.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  const mods = { firebase: window.firebase };
  window.__firebaseLoaded = true;
  window.__firebaseModules = mods;
  return mods;
}

// --- Cloud Sync (Firebase) ---
async function manualSyncToCloud() {
  try {
    if (!isPremium) {
      iosAlert('Cloud sync requires Premium.', 'Upgrade Required');
      return;
    }
    const { firebase } = await loadFirebase();
    const app = firebase.initializeApp(getFirebaseConfig(), 'stashRxSync');
    const auth = firebase.auth(app);
    await auth.signInAnonymously();

    const storage = firebase.storage(app);
    const deviceId = getDeviceID();
    const storageRef = storage.ref(`backups/${deviceId}.json`);

    const inventory = await db.inventory.toArray();
    const sales = await db.sales.toArray();
    const expenses = await db.expenses.toArray();
    const customers = await db.customers.toArray();

    const backupData = JSON.stringify({ inventory, sales, expenses, customers, timestamp: new Date().toISOString() });
    const snapshot = await storageRef.putString(backupData);
    iosAlert('Data synced to cloud successfully!', 'Cloud Sync');
  } catch (e) {
    console.error('Sync error:', e);
    iosAlert('Sync failed: ' + e.message, 'Error');
  }
}

async function restoreFromCloud() {
  try {
    if (!isPremium) {
      iosAlert('Cloud sync requires Premium.', 'Upgrade Required');
      return;
    }
    iosConfirm('This will replace all local data with cloud backup. Continue?', 'Restore', async () => {
      try {
        const { firebase } = await loadFirebase();
        const app = firebase.initializeApp(getFirebaseConfig(), 'stashRxRestore');
        const auth = firebase.auth(app);
        await auth.signInAnonymously();

        const storage = firebase.storage(app);
        const deviceId = getDeviceID();
        const storageRef = storage.ref(`backups/${deviceId}.json`);

        const jsonStr = await storageRef.getDownloadURL().then(async url => {
          const resp = await fetch(url);
          return resp.text();
        });
        const data = JSON.parse(jsonStr);

        if (data.inventory) { await db.inventory.clear(); await db.inventory.bulkAdd(data.inventory); }
        if (data.sales) { await db.sales.clear(); await db.sales.bulkAdd(data.sales); }
        if (data.expenses) { await db.expenses.clear(); await db.expenses.bulkAdd(data.expenses); }
        if (data.customers) { await db.customers.clear(); await db.customers.bulkAdd(data.customers); }

        await loadInventory();
        await renderInventoryStatus();
        renderExpenses();
        iosAlert('Data restored from cloud successfully!', 'Restore');
      } catch (e) {
        console.error('Restore error:', e);
        iosAlert('Restore failed: ' + e.message, 'Error');
      }
    });
  } catch (e) {
    console.error('Restore error:', e);
  }
}

// --- Legal ---
async function showLegal(type) {
  const file = type === 'terms' ? 'terms.txt' : 'privacy.txt';
  const title = type === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  try {
    const resp = await fetch(file);
    if (!resp.ok) throw new Error('Failed to load');
    const text = await resp.text();
    iosAlert(text, title);
  } catch (e) {
    console.error('Legal fetch error:', e);
    iosAlert('Could not load the document. Check your connection.', 'Error');
  }
}

export { exportData, handleImport, manualSyncToCloud, restoreFromCloud, showLegal };
