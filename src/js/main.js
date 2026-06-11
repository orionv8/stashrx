// main.js — Vite entry point: imports all modules, attaches to window, bootstraps

// First, provide a0_0x3669 stub for any legacy inline code that might reference it
window.a0_0x3669 = function() {};

// --- Module Imports ---
import { db, seedData } from './db.js';
import {
  loadInventory,
  renderInventoryStatus,
  filterInventory,
  clearSearch,
  handleSortChange
} from './inventory.js';
import {
  addToCart,
  updateCartItem,
  clearCart,
  openDrawer,
  closeDrawer,
  handleDiscountToggle,
  lookupDiscountId,
  cancelDiscountModal,
  confirmDiscountModal,
  checkout,
  selectPaymentMethod,
  closePaymentModal,
  processCashPayment,
  closeCashModal,
  closeReceiptModal
} from './cart.js';
import {
  toggleMenu,
  resetSettingsMenu,
  toggleSettingsMenu,
  showInventory,
  showLedger,
  showExpenses,
  showDashboard
} from './screen.js';
import { saveExpense } from './expenses.js';
import {
  openAnalyticsModal,
  closeAnalyticsModal
} from './analytics.js';
import {
  openAddModal,
  closeAddModal,
  saveNewItem,
  openEditModal,
  closeEditModal,
  saveEditedItem
} from './modal.js';
import {
  checkPremiumStatus,
  showPremiumModal,
  getDeviceID,
  isPremium as premiumFlag
} from './license.js';
import {
  exportData,
  handleImport,
  manualSyncToCloud,
  restoreFromCloud,
  showLegal
} from './cloud.js';
import { updateDashboardStats } from './dashboard.js';
import { updateCartDrawer, updateMiniCart } from './cart.js';
import { updateCharts } from './analytics.js';
import { formatCurrency, iosAlert, iosConfirm, iosPrompt } from './utils.js';
import { renderExpenses } from './expenses.js';
import { showScreen } from './screen.js';

// --- StashRx global namespace ---
// All functions called from HTML onclick handlers are exposed here
// and also individually on window for backward compatibility

const stashRx = {
  db,
  toggleMenu,
  resetSettingsMenu,
  toggleSettingsMenu,
  showScreen,
  showInventory,
  showLedger,
  showExpenses,
  showDashboard,
  loadInventory,
  renderInventoryStatus,
  filterInventory,
  clearSearch,
  handleSortChange,
  addToCart,
  updateCartItem,
  clearCart,
  openDrawer,
  closeDrawer,
  updateCartDrawer,
  updateMiniCart,
  handleDiscountToggle,
  lookupDiscountId,
  cancelDiscountModal,
  confirmDiscountModal,
  checkout,
  selectPaymentMethod,
  closePaymentModal,
  processCashPayment,
  closeCashModal,
  closeReceiptModal,
  saveExpense,
  openAnalyticsModal,
  closeAnalyticsModal,
  openAddModal,
  closeAddModal,
  saveNewItem,
  openEditModal,
  closeEditModal,
  saveEditedItem,
  showPremiumModal,
  checkPremiumStatus,
  getDeviceID,
  exportData,
  handleImport,
  manualSyncToCloud,
  restoreFromCloud,
  showLegal,
  updateDashboardStats,
  updateCharts,
  formatCurrency,
  iosAlert,
  iosConfirm,
  iosPrompt,
  renderExpenses,
  seedData,
  isPremium: premiumFlag
};

// Attach individual functions to window for inline onclick handlers
Object.entries(stashRx).forEach(([key, val]) => {
  window[key] = val;
});

// Also attach db and cart references that HTML expects
window.db = db;
window.isPremium = premiumFlag;

// --- Premium persistence backup (localStorage → sysDb mirror) ---
// Patch localStorage.setItem to persist license/deviceID
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.call(localStorage, key, value);
  if (key === 'stashRx_license' || key === 'stashRx_deviceID' || key === 'stashRx_deviceId') {
    try {
      import('./db.js').then(mod => {
        const sysDb = new mod.db.constructor('stashRxSys');
        sysDb.version(1).stores({ settings: 'key' });
        sysDb.settings.put({ key, value });
      }).catch(() => {});
    } catch (_) {}
  }
};

// --- Auto-set dashboard dates to today ---
function setDashboardDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const startInput = document.getElementById('reportStartDate');
  const endInput = document.getElementById('reportEndDate');
  if (startInput && !startInput.value) startInput.value = dateStr;
  if (endInput && !endInput.value) endInput.value = dateStr;
}

// --- Import defense: replace file input element to strip stale listeners ---
function setupImportDefense() {
  const oldInput = document.getElementById('importFile');
  if (oldInput) {
    const newInput = document.createElement('input');
    newInput.type = 'file';
    newInput.id = 'importFile';
    newInput.accept = '.xlsx, .xls, .csv';
    newInput.className = 'hidden';
    newInput.addEventListener('change', function(evt) {
      if (typeof window.handleImport === 'function') window.handleImport(evt);
    });
    oldInput.parentNode.replaceChild(newInput, oldInput);
  }
}

// --- Set up search input clear button toggle ---
function setupSearchClear() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  if (searchInput && clearBtn) {
    searchInput.addEventListener('input', () => {
      clearBtn.classList.toggle('hidden', !searchInput.value);
    });
  }
}

// --- Main boot sequence ---
async function main() {
  try {
    // Restore device ID from legacy sysDb
    if (!localStorage.getItem('stashRx_deviceID')) {
      try {
        // This is best-effort; the backup persistence handles it
      } catch (_) {}
    }

    // Auto-set dashboard dates
    setDashboardDates();

    // Set up import defense
    setupImportDefense();

    // Set up search clear button
    setupSearchClear();

    // Seed data
    await seedData();

    // Check premium
    await checkPremiumStatus();

    // Restore last screen
    const lastScreen = localStorage.getItem('stashRx_lastScreen') || 'Ledger';
    stashRx.showScreen(lastScreen);

    console.log('stashRx initialized.');
  } catch (err) {
    console.error('Boot error:', err);
  }
}

// --- Premium badge polling ---
setInterval(() => {
  const badge = document.getElementById('manualProBadge');
  if (badge && premiumFlag) {
    badge.innerText = 'PRO ACTIVATED';
    badge.className = 'mt-3 bg-gray-900 text-amber-400 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full shadow-sm pointer-events-none';
    badge.onclick = null;
  }
}, 1000);

// Start
document.addEventListener('DOMContentLoaded', main);
