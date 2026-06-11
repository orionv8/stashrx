// Modal management: Add Item, Edit Item modals
import { db } from './db.js';
import { loadInventory, renderInventoryStatus, escapeHtml } from './inventory.js';

function openAddModal() {
  ['addGeneric', 'addBrand', 'addStock', 'addPrice', 'addExp'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const overlay = document.getElementById('addModalOverlay');
  const card = document.getElementById('addModalCard');
  if (!overlay || !card) return;
  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
  card.classList.remove('scale-95');
}

function closeAddModal() {
  const overlay = document.getElementById('addModalOverlay');
  const card = document.getElementById('addModalCard');
  if (!overlay || !card) return;
  overlay.classList.add('opacity-0');
  card.classList.add('scale-95');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

async function saveNewItem() {
  const generic = document.getElementById('addGeneric').value.trim();
  const brand = document.getElementById('addBrand').value.trim();
  const stock = parseInt(document.getElementById('addStock').value) || 0;
  const price = parseFloat(document.getElementById('addPrice').value) || 0;
  const expRaw = document.getElementById('addExp').value.trim();

  if (!generic) {
    alert('Generic name is required');
    return;
  }

  let exp = expRaw;
  if (exp && !/^(0[1-9]|1[0-2])\/20[2-9][0-9]$/.test(exp)) {
    alert('Expiry must be MM/YYYY format');
    return;
  }

  try {
    await db.inventory.add({ generic, brand, stock, price, exp });
    closeAddModal();
    await loadInventory();
    await renderInventoryStatus();
  } catch (e) {
    console.error('saveNewItem error:', e);
    alert('Failed to save item.');
  }
}

async function openEditModal(id) {
  try {
    const item = await db.inventory.get(id);
    if (!item) return;

    document.getElementById('editItemId').value = id;
    document.getElementById('editGeneric').value = item.generic || '';
    document.getElementById('editBrand').value = item.brand || '';
    document.getElementById('editStock').value = item.stock || 0;
    document.getElementById('editPrice').value = item.price || 0;
    document.getElementById('editExp').value = item.exp || '';

    const overlay = document.getElementById('editModalOverlay');
    const card = document.getElementById('editModalCard');
    if (!overlay || !card) return;
    overlay.classList.remove('hidden');
    void overlay.offsetWidth;
    overlay.classList.remove('opacity-0');
    card.classList.remove('scale-95');
  } catch (e) {
    console.error('openEditModal error:', e);
  }
}

function closeEditModal() {
  const overlay = document.getElementById('editModalOverlay');
  const card = document.getElementById('editModalCard');
  if (!overlay || !card) return;
  overlay.classList.add('opacity-0');
  card.classList.add('scale-95');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

async function saveEditedItem() {
  const id = parseInt(document.getElementById('editItemId').value);
  const generic = document.getElementById('editGeneric').value.trim();
  const brand = document.getElementById('editBrand').value.trim();
  const stock = parseInt(document.getElementById('editStock').value) || 0;
  const price = parseFloat(document.getElementById('editPrice').value) || 0;
  const exp = document.getElementById('editExp').value.trim();

  if (!generic) return;

  try {
    await db.inventory.update(id, { generic, brand, stock, price, exp });
    closeEditModal();
    await loadInventory();
    await renderInventoryStatus();
  } catch (e) {
    console.error('saveEditedItem error:', e);
  }
}

export { openAddModal, closeAddModal, saveNewItem, openEditModal, closeEditModal, saveEditedItem };
