import Dexie from 'dexie';

window.Dexie = Dexie;

// --- Global App State ---
let cart = [];
let isPremium = false;

// --- Database Setup ---
const db = new Dexie('stashRx');
db.version(4).stores({
    inventory: '++id,generic,brand,exp,stock',
    sales: '++id,date,total',
    expenses: '++id,date,amount,category',
    customers: 'idNumber,name'
});

// --- Constants ---
const INVENTORY_LIST_ID = 'inventoryList';
const INVENTORY_STATUS_LIST_ID = 'inventoryStatusList';
const SEARCH_INPUT_ID = 'searchInput';
const CLEAR_SEARCH_BTN_ID = 'clearSearchBtn';
const SORT_SELECT_ID = 'invSort';
const HEADER_TITLE_ID = 'headerTitle';
const SEARCH_CONTAINER_ID = 'searchContainer';

// --- Sample Seed Data ---
const SAMPLE_INVENTORY = [
    { generic: 'Paracetamol', brand: 'Biogesic', stock: 120, price: 5.50, exp: '06/2026' },
    { generic: 'Ibuprofen', brand: 'Advil', stock: 80, price: 12.00, exp: '08/2025' },
    { generic: 'Amoxicillin', brand: 'Novamox', stock: 45, price: 18.75, exp: '03/2026' },
    { generic: 'Cetirizine', brand: 'Allerta', stock: 200, price: 8.25, exp: '12/2025' },
    { generic: 'Losartan', brand: 'Cozaar', stock: 30, price: 25.00, exp: '01/2025' },
    { generic: 'Metformin', brand: 'Glucophage', stock: 15, price: 15.50, exp: '04/2025' },
    { generic: 'Salbutamol', brand: 'Ventolin', stock: 25, price: 22.00, exp: '09/2026' },
    { generic: 'Omeprazole', brand: 'Losec', stock: 60, price: 14.00, exp: '07/2025' },
    { generic: 'Loperamide', brand: 'Diatabs', stock: 90, price: 6.75, exp: '11/2026' },
    { generic: 'Mefenamic Acid', brand: 'Dolfenal', stock: 0, price: 9.50, exp: '02/2025' },
];

// --- Utility ---
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₱' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
window.formatCurrency = formatCurrency;

// --- Screen Navigation ---
function showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('[id^="screen"]').forEach(el => {
        el.classList.add('hidden');
    });

    // Show target screen
    const target = document.getElementById('screen' + screenName);
    if (target) {
        target.classList.remove('hidden');
    }

    // Update header title
    const titleEl = document.getElementById(HEADER_TITLE_ID);
    const titles = {
        'Ledger': 'Sales Ledger',
        'Inventory': 'Inventory',
        'Expenses': 'Expenses',
        'Dashboard': 'Dashboard'
    };
    if (titleEl) titleEl.textContent = titles[screenName] || 'Items';

    // Show search bar only for Ledger and Inventory
    const searchContainer = document.getElementById(SEARCH_CONTAINER_ID);
    if (searchContainer) {
        if (screenName === 'Ledger' || screenName === 'Inventory') {
            searchContainer.classList.remove('hidden');
        } else {
            searchContainer.classList.add('hidden');
        }
    }

    // Load data for the shown screen
    if (screenName === 'Ledger') {
        loadInventory();
    } else if (screenName === 'Inventory') {
        renderInventoryStatus();
    } else if (screenName === 'Dashboard') {
        updateDashboardStats();
    }

    // Close menu if open
    toggleMenu();
}

function showLedger() { showScreen('Ledger'); }
function showInventory() { showScreen('Inventory'); }
function showExpenses() { showScreen('Expenses'); }
function showDashboard() { showScreen('Dashboard'); }

window.showScreen = showScreen;
window.showLedger = showLedger;
window.showInventory = showInventory;
window.showExpenses = showExpenses;
window.showDashboard = showDashboard;

// --- Sidebar Menu ---
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const panel = document.getElementById('sideMenuPanel');
    if (!menu) { console.warn('Menu element not found.'); return; }
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        // Animate panel in
        requestAnimationFrame(() => {
            if (panel) panel.classList.remove('-translate-x-full');
            if (panel) panel.classList.add('translate-x-0');
        });
    } else {
        if (panel) {
            panel.classList.remove('translate-x-0');
            panel.classList.add('-translate-x-full');
        }
        setTimeout(() => menu.classList.add('hidden'), 300);
    }
}
window.toggleMenu = toggleMenu;
window.resetSettingsMenu = function() {};

// --- Inventory Load (for Ledger view) ---
async function loadInventory() {
    const listEl = document.getElementById(INVENTORY_LIST_ID);
    if (!listEl) return;

    try {
        const items = await db.inventory.toArray();
        if (items.length === 0) {
            listEl.innerHTML = '<div class="p-4 text-center text-sm text-gray-500 mt-8">No items in inventory. Add items from the Inventory screen.</div>';
            return;
        }

        // Get sales data for "Items Sold" sort option
        const sales = await db.sales.toArray();
        const soldCounts = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    soldCounts[item.id] = (soldCounts[item.id] || 0) + (item.qty || 0);
                });
            }
        });

        // Get search query
        const searchInput = document.getElementById(SEARCH_INPUT_ID);
        const query = searchInput ? searchInput.value.toLowerCase() : '';

        // Get sort option
        const sortSelect = document.getElementById(SORT_SELECT_ID);
        const sortBy = sortSelect ? sortSelect.value : 'sold';

        // Filter
        let filtered = items;
        if (query) {
            filtered = items.filter(item =>
                (item.generic && item.generic.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query))
            );
        }

        // Sort
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'sold':
                    return (soldCounts[b.id] || 0) - (soldCounts[a.id] || 0);
                case 'expiry': {
                    if (!a.exp) return 1;
                    if (!b.exp) return -1;
                    const aParts = a.exp.split('/');
                    const bParts = b.exp.split('/');
                    const aDate = new Date(parseInt(aParts[1]), parseInt(aParts[0]) - 1);
                    const bDate = new Date(parseInt(bParts[1]), parseInt(bParts[0]) - 1);
                    return aDate - bDate;
                }
                case 'stock':
                    return (a.stock || 0) - (b.stock || 0);
                case 'name':
                    return (a.brand || a.generic || '').localeCompare(b.brand || b.generic || '');
                default:
                    return 0;
            }
        });

        // Render
        listEl.innerHTML = filtered.map(item => {
            const brand = item.brand || '';
            const generic = item.generic || '';
            const stock = item.stock || 0;
            const price = item.price || 0;

            // Expiry info
            let expHtml = '';
            if (item.exp) {
                const parts = item.exp.split('/');
                const expDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1);
                const monthsLeft = (expDate.getFullYear() - currentYear) * 12 + (expDate.getMonth() - currentMonth);
                let expClass = 'text-green-600';
                let expLabel = 'OK';
                if (monthsLeft < 0) { expClass = 'text-red-500'; expLabel = 'Expired'; }
                else if (monthsLeft < 6) { expClass = 'text-orange-500'; expLabel = `${monthsLeft} mos.`; }
                else if (monthsLeft < 12) { expClass = 'text-yellow-500'; expLabel = `${monthsLeft} mos.`; }

                expHtml = `<div class="border-t border-gray-100 px-3 py-2 text-xs flex justify-between items-center bg-gray-50/50">
                    <span class="font-medium text-gray-500">Expires: ${item.exp}</span>
                    <span class="font-bold ${expClass}">${expLabel}</span>
                </div>`;
            }

            return `<div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onclick="addToCart(${item.id}, '${generic.replace(/'/g, "\\'")}', ${price})">
                <div class="flex justify-between items-start">
                    <div class="flex-grow pr-4">
                        <p class="font-semibold text-gray-800">${generic}</p>
                        <p class="text-xs text-gray-500">${brand}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="font-bold text-gray-800">${formatCurrency(price)}</p>
                        <p class="text-xs text-gray-400">Stock: ${stock}</p>
                    </div>
                </div>
                ${expHtml}
            </div>`;
        }).join('');

        // Show/hide clear search button
        const clearBtn = document.getElementById(CLEAR_SEARCH_BTN_ID);
        if (clearBtn) {
            if (query) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error loading inventory:', err);
        listEl.innerHTML = '<div class="p-4 text-center text-sm text-red-500 mt-8">Error loading inventory.</div>';
    }
}
window.loadInventory = loadInventory;

// --- Inventory Status (for Inventory screen) ---
async function renderInventoryStatus() {
    const listEl = document.getElementById(INVENTORY_STATUS_LIST_ID);
    if (!listEl) return;

    try {
        const items = await db.inventory.toArray();
        if (items.length === 0) {
            listEl.innerHTML = '<div class="p-4 text-center text-sm text-gray-500 mt-8">No items in inventory.</div>';
            return;
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Sort by expiry for status view
        items.sort((a, b) => {
            if (!a.exp) return 1;
            if (!b.exp) return -1;
            const aParts = a.exp.split('/');
            const bParts = b.exp.split('/');
            return (parseInt(aParts[1]) - parseInt(bParts[1])) * 12 + (parseInt(aParts[0]) - parseInt(bParts[0]));
        });

        listEl.innerHTML = items.map(item => {
            const brand = item.brand || '';
            const generic = item.generic || '';
            const stock = item.stock || 0;

            // Stock status
            let stockClass = '';
            let statusLabel = 'In Stock';
            if (stock <= 0) { stockClass = 'text-red-500'; statusLabel = 'Out of Stock'; }
            else if (stock <= 10) { stockClass = 'text-orange-500'; statusLabel = 'Low Stock'; }
            else { stockClass = 'text-gray-800'; }

            // Expiry status
            let expHtml = '';
            if (item.exp) {
                const parts = item.exp.split('/');
                const expDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1);
                const monthsLeft = (expDate.getFullYear() - currentYear) * 12 + (expDate.getMonth() - currentMonth);
                let expClass = 'text-green-600';
                let expLabel = 'OK';
                if (monthsLeft < 0) { expClass = 'text-red-500'; expLabel = 'Expired'; }
                else if (monthsLeft < 6) { expClass = 'text-orange-500'; expLabel = `${monthsLeft} mos.`; }
                else if (monthsLeft < 12) { expClass = 'text-yellow-500'; expLabel = `${monthsLeft} mos.`; }

                expHtml = `<div class="border-t border-gray-100 px-3 py-2 text-xs flex justify-between items-center bg-gray-50/50">
                    <span class="font-medium text-gray-500">Expires: ${item.exp}</span>
                    <span class="font-bold ${expClass}">${expLabel}</span>
                </div>`;
            }

            return `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" onclick="openEditModal(${item.id})">
                <div class="p-3">
                    <div class="flex justify-between items-start">
                        <div class="flex-grow pr-4">
                            <p class="font-semibold text-gray-800">${brand}</p>
                            <p class="text-xs text-gray-500">${generic}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="font-bold text-gray-800 ${stockClass}">${stock}</p>
                            <p class="text-xs text-gray-400">${statusLabel}</p>
                        </div>
                    </div>
                </div>
                ${expHtml}
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Error rendering inventory status:', err);
        listEl.innerHTML = '<div class="p-4 text-center text-sm text-red-500 mt-8">Error loading inventory status.</div>';
    }
}
window.renderInventoryStatus = renderInventoryStatus;

// --- Search ---
window.filterInventory = async function() {
    // Determine which view is active
    const ledger = document.getElementById('screenLedger');
    if (ledger && !ledger.classList.contains('hidden')) {
        await loadInventory();
    } else {
        await renderInventoryStatus();
    }
};

window.clearSearch = async function() {
    const searchInput = document.getElementById(SEARCH_INPUT_ID);
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById(CLEAR_SEARCH_BTN_ID);
    if (clearBtn) clearBtn.classList.add('hidden');
    await loadInventory();
};

window.handleSortChange = async function() {
    await loadInventory();
};

// --- Seed Data ---
window.seedData = async function() {
    console.log('Initializing seed data...');
    try {
        const count = await db.inventory.count();
        if (count === 0) {
            await db.inventory.bulkAdd(SAMPLE_INVENTORY);
            console.log('Seed data added:', SAMPLE_INVENTORY.length, 'items');
        } else {
            console.log('Inventory already seeded.');
        }
    } catch (err) {
        console.error('Error seeding data:', err);
    }
};

// --- Premium Check ---
window.checkPremiumStatus = async function() {
    console.log('Checking premium status...');
    const license = localStorage.getItem('stashRx_license');
    isPremium = !!license;
    console.log(isPremium ? 'Premium active.' : 'Standard mode.');
    return isPremium;
};

// --- iOS-style Alert Modal ---
function iosAlert(message, title = 'Notice') {
    const overlay = document.getElementById('iosModalOverlay');
    const card = document.getElementById('iosModalCard');
    const titleEl = document.getElementById('iosModalTitle');
    const msgEl = document.getElementById('iosModalMessage');
    const btnsEl = document.getElementById('iosModalButtons');
    if (!overlay || !card) return;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btnsEl) btnsEl.innerHTML = '<button onclick="closeIosModal()" class="flex-1 py-2.5 text-emerald-600 font-semibold text-[17px] active:bg-gray-200/50 transition tracking-tight">OK</button>';
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        card.classList.remove('scale-95');
    });
}
window.iosAlert = iosAlert;

window.closeIosModal = function() {
    const overlay = document.getElementById('iosModalOverlay');
    const card = document.getElementById('iosModalCard');
    if (!overlay) return;
    overlay.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => overlay.classList.add('hidden'), 200);
};

// --- Inventory CRUD: Add Item ---
window.openAddModal = function() {
    document.getElementById('addGeneric').value = '';
    document.getElementById('addBrand').value = '';
    document.getElementById('addStock').value = '';
    document.getElementById('addPrice').value = '';
    document.getElementById('addExp').value = '';
    const overlay = document.getElementById('addModalOverlay');
    const card = document.getElementById('addModalCard');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    });
};

window.closeAddModal = function() {
    const overlay = document.getElementById('addModalOverlay');
    const card = document.getElementById('addModalCard');
    if (!overlay) return;
    overlay.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => overlay.classList.add('hidden'), 300);
};

window.saveNewItem = async function() {
    const generic = document.getElementById('addGeneric').value.trim();
    const brand = document.getElementById('addBrand').value.trim();
    const stock = parseInt(document.getElementById('addStock').value) || 0;
    const price = parseFloat(document.getElementById('addPrice').value) || 0;
    const expRaw = document.getElementById('addExp').value.trim();

    if (!generic) {
        iosAlert('Generic name is required.', 'Missing Field');
        return;
    }
    if (expRaw && !/^(0[1-9]|1[0-2])\/20[2-9][0-9]$/.test(expRaw)) {
        iosAlert('Expiry must be MM/YYYY format.', 'Invalid Format');
        return;
    }

    try {
        await db.inventory.add({ generic, brand, stock, price, exp: expRaw });
        closeAddModal();
        await loadInventory();
        renderInventoryStatus();
        iosAlert('Item added successfully.', 'Added');
    } catch (err) {
        console.error('Error adding item:', err);
        iosAlert('Could not save item. Please try again.', 'Error');
    }
};

// --- Inventory CRUD: Edit Item ---
window.openEditModal = async function(id) {
    const item = await db.inventory.get(id);
    if (!item) return;
    document.getElementById('editItemId').value = item.id;
    const genericEl = document.getElementById('editGeneric');
    const brandEl = document.getElementById('editBrand');
    const stockEl = document.getElementById('editStock');
    const priceEl = document.getElementById('editPrice');
    const expEl = document.getElementById('editExp');
    if (genericEl) genericEl.value = item.generic || '';
    if (brandEl) brandEl.value = item.brand || '';
    if (stockEl) stockEl.value = item.stock || 0;
    if (priceEl) priceEl.value = item.price || 0;
    if (expEl) expEl.value = item.exp || '';

    const overlay = document.getElementById('editModalOverlay');
    const card = document.getElementById('editModalCard');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    });
};

window.closeEditModal = function() {
    const overlay = document.getElementById('editModalOverlay');
    const card = document.getElementById('editModalCard');
    if (!overlay) return;
    overlay.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => overlay.classList.add('hidden'), 300);
};

window.saveEditedItem = async function() {
    const idEl = document.getElementById('editItemId');
    const id = parseInt(idEl ? idEl.value : 0);
    if (!id) return;

    const updates = {
        generic: document.getElementById('editGeneric').value.trim(),
        brand: document.getElementById('editBrand').value.trim(),
        stock: parseInt(document.getElementById('editStock').value) || 0,
        price: parseFloat(document.getElementById('editPrice').value) || 0,
        exp: document.getElementById('editExp').value.trim()
    };

    if (!updates.generic) {
        iosAlert('Generic name cannot be empty.', 'Missing Field');
        return;
    }
    if (updates.exp && !/^(0[1-9]|1[0-2])\/20[2-9][0-9]$/.test(updates.exp)) {
        iosAlert('Expiry must be MM/YYYY format.', 'Invalid Format');
        return;
    }

    try {
        await db.inventory.update(id, updates);
        closeEditModal();
        await loadInventory();
        renderInventoryStatus();
        iosAlert('Item updated successfully.', 'Updated');
    } catch (err) {
        console.error('Error updating item:', err);
        iosAlert('Could not update item. Please try again.', 'Error');
    }
};

// --- Cart ---
window.addToCart = function(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    updateMiniCart();
    openDrawer();
};

window.updateCartItem = function(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
    }
    updateMiniCart();
};

window.clearCart = function() {
    cart = [];
    updateMiniCart();
    const toggle = document.getElementById('pwdToggle');
    if (toggle) toggle.checked = false;
    const discount = document.getElementById('discountBreakdown');
    if (discount) discount.classList.add('hidden');
    closeDrawer();
};

function updateMiniCart() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

    const miniCart = document.getElementById('miniCart');
    const miniCount = document.getElementById('miniCount');
    const miniTotal = document.getElementById('miniTotal');
    const drawerTotal = document.getElementById('drawerTotal');

    if (totalQty > 0) {
        if (miniCart) {
            miniCart.classList.remove('translate-y-24');
            miniCart.classList.add('translate-y-0');
        }
    } else {
        if (miniCart) {
            miniCart.classList.remove('translate-y-0');
            miniCart.classList.add('translate-y-24');
        }
    }

    if (miniCount) miniCount.textContent = totalQty;
    if (miniTotal) miniTotal.textContent = formatCurrency(totalPrice);
    if (drawerTotal) drawerTotal.textContent = formatCurrency(totalPrice);

    updateCartDrawer();
}
window.updateMiniCart = updateMiniCart;

function updateCartDrawer() {
    const list = document.getElementById('cartItemsList');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-500 py-8">No items in cart</p>';
        return;
    }

    list.innerHTML = cart.map(item => `
        <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p class="font-medium text-gray-800">${item.name}</p>
                <p class="text-sm text-gray-500">${formatCurrency(item.price)}</p>
            </div>
            <div class="flex items-center space-x-3">
                <button class="w-8 h-8 bg-gray-200 rounded-full text-lg font-bold text-gray-600" onclick="updateCartItem(${item.id}, -1)">-</button>
                <span class="text-lg font-bold w-6 text-center">${item.qty}</span>
                <button class="w-8 h-8 bg-gray-200 rounded-full text-lg font-bold text-gray-600" onclick="updateCartItem(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join('');
}
window.updateCartDrawer = updateCartDrawer;

window.openDrawer = function() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay) overlay.classList.remove('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-closed');
        drawer.classList.add('drawer-open');
    }
};

window.closeDrawer = function() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay) overlay.classList.add('hidden');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-closed');
    }
};

// --- Checkout ---
window.checkout = async function() {
    if (cart.length === 0) {
        iosAlert('Your cart is empty. Add items before checking out.', 'Empty Cart');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const saleItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.qty * item.price
    }));

    try {
        await db.transaction('rw', db.inventory, db.sales, async () => {
            // Deduct stock for each item
            for (const item of cart) {
                const invItem = await db.inventory.get(item.id);
                if (!invItem) {
                    throw new Error(`Item "${item.name}" no longer exists in inventory.`);
                }
                const newStock = invItem.stock - item.qty;
                if (newStock < 0) {
                    throw new Error(`Insufficient stock for "${item.name}". Available: ${invItem.stock}, requested: ${item.qty}`);
                }
                await db.inventory.update(item.id, { stock: newStock });
            }

            // Record sale
            await db.sales.add({
                date: new Date(),
                total: subtotal,
                items: saleItems,
                discountDetails: {}
            });
        });

        // Transaction succeeded — clear cart and refresh
        const receiptItems = cart.map(i => `${i.name}×${i.qty}`).join(', ');
        cart = [];
        updateMiniCart();

        const toggle = document.getElementById('pwdToggle');
        if (toggle) toggle.checked = false;
        closeDrawer();

        await loadInventory();
        renderInventoryStatus();

        iosAlert(
            `Sale completed!\n\nItems: ${receiptItems}\nTotal: ${formatCurrency(subtotal)}\nStock levels updated.`,
            'Checkout Complete'
        );
    } catch (err) {
        console.error('Checkout error:', err);
        iosAlert(err.message, 'Checkout Failed');
    }
};

// --- Discount stubs (UI exists in cart drawer, keep from crashing) ---
window.handleDiscountToggle = function() {
    // Show discount modal
    const overlay = document.getElementById('discountModalOverlay');
    const card = document.getElementById('discountModalCard');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    });
};

window.openDiscountModal = window.handleDiscountToggle;

window.cancelDiscountModal = function() {
    const toggle = document.getElementById('pwdToggle');
    if (toggle) toggle.checked = false;
    const overlay = document.getElementById('discountModalOverlay');
    const card = document.getElementById('discountModalCard');
    if (!overlay) return;
    overlay.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => overlay.classList.add('hidden'), 200);
};

window.confirmDiscountModal = function() {
    window.cancelDiscountModal();
};

window.closeDiscountModal = window.cancelDiscountModal;

window.lookupDiscountId = function() {};

window.updateDiscountDisplay = function() {};

// --- Remaining stubs ---
window.toggleSettingsMenu = function() {
    const mainPanel = document.getElementById('mainNavPanel');
    const settingsPanel = document.getElementById('settingsNavPanel');
    if (!mainPanel || !settingsPanel) return;

    const mainIsVisible = !mainPanel.classList.contains('translate-y-full');
    if (mainIsVisible) {
        mainPanel.classList.add('-translate-y-full');
        mainPanel.classList.remove('translate-y-0');
        settingsPanel.classList.remove('translate-y-full');
        settingsPanel.classList.add('translate-y-0');
    } else {
        mainPanel.classList.remove('-translate-y-full');
        mainPanel.classList.add('translate-y-0');
        settingsPanel.classList.remove('translate-y-0');
        settingsPanel.classList.add('translate-y-full');
    }
};

window.exportData = function() {
    iosAlert('Export will be restored in a later slice.', 'Export');
};

window.restoreFromCloud = function() {
    iosAlert('Cloud restore is not connected yet.', 'Cloud Restore');
};

window.manualSyncToCloud = function() {
    iosAlert('Cloud sync is not connected yet.', 'Cloud Sync');
};

window.openAnalyticsModal = function() {};
window.closeAnalyticsModal = function() {};
window.saveExpense = function() {};
window.renderExpenses = function() {};
window.updateDashboardStats = function() {};
window.showPremiumModal = function() {
    iosAlert('Premium licensing UI will be restored in a later slice.', 'Premium');
};

// --- Initialize ---
async function main() {
    try {
        // Restore Device ID
        if (!localStorage.getItem('stashRx_deviceID')) {
            const sysDb = new Dexie('stashRxSys');
            sysDb.version(1).stores({ settings: 'id' });
            let savedDevId = await sysDb.settings.get('stashRx_deviceID');
            if (!savedDevId) savedDevId = await sysDb.settings.get('stashRx_deviceId');
            if (savedDevId && savedDevId.value) {
                localStorage.setItem('stashRx_deviceID', savedDevId.value);
            }
            // Restore License
            if (!localStorage.getItem('stashRx_license')) {
                const savedLic = await sysDb.settings.get('stashRx_license');
                if (savedLic && savedLic.value) {
                    localStorage.setItem('stashRx_license', savedLic.value);
                }
            }
        }

        await window.seedData();
        await window.checkPremiumStatus();

        // Load the ledger view by default
        const ledgerScreen = document.getElementById('screenLedger');
        if (ledgerScreen) {
            ledgerScreen.classList.remove('hidden');
            await loadInventory();
        }

        console.log('stashRx initialized successfully.');
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

// Start
document.addEventListener('DOMContentLoaded', main);
