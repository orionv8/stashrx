// Screen navigation, sidebar, settings menu
import { loadInventory, renderInventoryStatus } from './inventory.js';
import { renderExpenses } from './expenses.js';
import { updateDashboardStats } from './dashboard.js';

function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');

  const panel = document.getElementById('sideMenuPanel');
  if (panel) {
    if (isHidden) {
      // Opening
      panel.classList.remove('-translate-x-full');
      panel.classList.add('translate-x-0');
    } else {
      // Closing
      panel.classList.remove('translate-x-0');
      panel.classList.add('-translate-x-full');
    }
  }
}

function resetSettingsMenu() {
  const mainNav = document.getElementById('mainNavPanel');
  const settingsNav = document.getElementById('settingsNavPanel');
  if (mainNav) mainNav.style.transform = 'translateY(0)';
  if (settingsNav) settingsNav.style.transform = 'translateY(100%)';
}

function toggleSettingsMenu() {
  const mainNav = document.getElementById('mainNavPanel');
  const settingsNav = document.getElementById('settingsNavPanel');
  if (!mainNav || !settingsNav) return;

  const isSettingsOpen = settingsNav.style.transform === 'translateY(0%)';
  if (isSettingsOpen) {
    resetSettingsMenu();
  } else {
    mainNav.style.transform = 'translateY(-100%)';
    settingsNav.style.transform = 'translateY(0%)';
  }
}

async function showScreen(screenName) {
  // Hide all screens
  document.querySelectorAll('[id^="screen"]').forEach(el => {
    if (el.id !== 'sideMenu' && el.id !== 'sideMenuPanel') {
      el.classList.add('hidden');
    }
  });

  // Show target screen
  const target = document.getElementById('screen' + screenName);
  if (target) {
    target.classList.remove('hidden');
    target.style.display = 'flex';
  }

  // Update header title
  const titleMap = {
    Ledger: 'Sales Ledger',
    Inventory: 'Inventory',
    Expenses: 'Expenses',
    Dashboard: 'Dashboard'
  };
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) headerTitle.textContent = titleMap[screenName] || 'Items';

  // Search visibility
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer) {
    searchContainer.style.display = (screenName === 'Inventory' || screenName === 'Ledger') ? 'flex' : 'none';
  }

  // Update nav active state
  document.querySelectorAll('#mainNav a').forEach(a => {
    a.classList.remove('bg-emerald-50', 'text-emerald-700', 'font-semibold');
    a.classList.add('text-gray-700', 'font-medium');
  });
  const navMap = {
    Dashboard: 'navDashboard',
    Inventory: 'navInventory',
    Ledger: 'navLedger',
    Expenses: 'navExpenses'
  };
  const activeNav = document.getElementById(navMap[screenName]);
  if (activeNav) {
    activeNav.classList.remove('text-gray-700', 'font-medium');
    activeNav.classList.add('bg-emerald-50', 'text-emerald-700', 'font-semibold');
  }

  // Save last screen
  localStorage.setItem('stashRx_lastScreen', screenName);

  // Load data
  if (screenName === 'Inventory') {
    await renderInventoryStatus();
  } else if (screenName === 'Ledger' || screenName === 'Inventory') {
    await loadInventory();
  } else if (screenName === 'Expenses') {
    renderExpenses();
  } else if (screenName === 'Dashboard') {
    updateDashboardStats();
  }

  toggleMenu();
}

function showInventory() { showScreen('Inventory'); }
function showLedger() { showScreen('Ledger'); }
function showExpenses() { showScreen('Expenses'); }
function showDashboard() { showScreen('Dashboard'); }

export {
  toggleMenu,
  resetSettingsMenu,
  toggleSettingsMenu,
  showScreen,
  showInventory,
  showLedger,
  showExpenses,
  showDashboard
};
