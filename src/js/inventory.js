// Inventory: load, render, search, sort
import { db } from './db.js';
import { formatCurrency } from './utils.js';

let currentSort = 'name';

async function loadInventory() {
  try {
    const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const sortSelect = document.getElementById('invSort');
    currentSort = sortSelect ? sortSelect.value : 'name';

    let items = await db.inventory.toArray();

    if (searchTerm) {
      items = items.filter(item =>
        (item.generic || '').toLowerCase().includes(searchTerm) ||
        (item.brand || '').toLowerCase().includes(searchTerm)
      );
    }

    switch (currentSort) {
      case 'sold':
        // Sort by items sold (can't track from inventory alone, fallback to name)
        items.sort((a, b) => (a.generic || '').localeCompare(b.generic || ''));
        break;
      case 'expiry':
        items.sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
        break;
      case 'stock':
        items.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      case 'name':
      default:
        items.sort((a, b) => (a.generic || '').localeCompare(b.generic || ''));
        break;
    }

    renderInventoryList(items);
  } catch (e) {
    console.error('loadInventory error:', e);
  }
}

function renderInventoryList(items) {
  const container = document.getElementById('inventoryList');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-400 py-16 text-sm">No medicines found</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const isExpiring = item.exp && /^0[1-9]\/20[0-9]{2}$|^1[0-2]\/20[0-9]{2}$/.test(item.exp);
    const expired = item.exp && isExpired(item.exp);
    const expiringSoon = item.exp && !expired && isNearExpiry(item.exp);

    return `
      <div class="bg-white rounded-2xl shadow-sm p-4 mb-3 flex items-center justify-between ${expired ? 'opacity-60' : ''}">
        <div class="flex-1">
          <div class="font-semibold text-[15px] text-gray-900">${escapeHtml(item.brand || item.generic)}</div>
          <div class="text-[13px] text-gray-500">${escapeHtml(item.generic || '')}</div>
          <div class="flex items-center space-x-3 mt-1">
            <span class="text-[13px] font-medium ${item.stock <= 10 ? 'text-red-500' : 'text-gray-700'}">Stock: ${item.stock || 0}</span>
            ${item.exp ? `<span class="text-[13px] font-medium ${expired ? 'text-red-500' : expiringSoon ? 'text-amber-500' : 'text-gray-700'}">${expired ? '⚠ Expired: ' : '⏳ Exp: '}${escapeHtml(item.exp)}</span>` : ''}
            <span class="text-[15px] font-bold text-emerald-600">${formatCurrency(item.price)}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="window.stashRx.openEditModal(${item.id})" class="text-gray-400 text-[13px] font-medium px-3 py-1.5 active:opacity-50">⟲</button>
          <button onclick="window.stashRx.addToCart(${item.id}, '${escapeJs(item.generic || item.brand || '')}', ${item.price || 0})" class="w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-sm active:scale-90 transition">+</button>
        </div>
      </div>`;
  }).join('');
}

async function renderInventoryStatus() {
  const container = document.getElementById('inventoryStatusList');
  if (!container) return;
  try {
    const items = await db.inventory.toArray();
    const sortBy = currentSort;
    // Same sort as main list
    items.sort((a, b) => (a.generic || '').localeCompare(b.generic || ''));

    container.innerHTML = items.map(item => {
      const expired = item.exp && isExpired(item.exp);
      const lowStock = (item.stock || 0) <= 10 && (item.stock || 0) > 0;
      const outOfStock = !item.stock || item.stock <= 0;

      return `
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between ${outOfStock ? 'opacity-50' : ''}">
          <div>
            <div class="font-semibold text-[15px] text-gray-900">${escapeHtml(item.brand || item.generic || '')}</div>
            <div class="text-[13px] text-gray-500">${escapeHtml(item.generic || '')}</div>
            <div class="flex space-x-3 mt-1">
              <span class="text-[13px] font-medium ${outOfStock ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-gray-600'}">
                ${outOfStock ? 'OUT OF STOCK' : `${item.stock} pcs`}
              </span>
              ${item.exp ? `<span class="text-[13px] ${expired ? 'text-red-500' : 'text-gray-400'}">${expired ? '⚠ EXPIRED' : 'Exp: ' + escapeHtml(item.exp)}</span>` : ''}
            </div>
          </div>
          <span class="text-[15px] font-bold text-emerald-600">${formatCurrency(item.price)}</span>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('renderInventoryStatus error:', e);
  }
}

function filterInventory() { loadInventory(); }
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  loadInventory();
}
function handleSortChange() { loadInventory(); }

// Helpers
function isExpired(exp) {
  if (!exp) return false;
  const parts = exp.split('/');
  if (parts.length !== 2) return false;
  const month = parseInt(parts[0]);
  const year = parseInt(parts[1]);
  const now = new Date();
  const expDate = new Date(year, month, 0);
  return expDate < now;
}

function isNearExpiry(exp) {
  if (!exp) return false;
  const parts = exp.split('/');
  if (parts.length !== 2) return false;
  const month = parseInt(parts[0]);
  const year = parseInt(parts[1]);
  const now = new Date();
  const expDate = new Date(year, month, 0);
  const threeMonths = 90 * 24 * 60 * 60 * 1000;
  return expDate > now && (expDate - now) < threeMonths;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m;
  });
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/[\\']/g, '\\$&');
}

export {
  loadInventory,
  renderInventoryStatus,
  filterInventory,
  clearSearch,
  handleSortChange,
  escapeHtml,
  escapeJs
};
