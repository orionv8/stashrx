# Inline JavaScript Blocks in /home/ubuntu/stashrx/app.html

## Script Block 1 — Lines 204–231
**Location**: `<head>`, after manifest/apple-touch-icon links  
**Description**: Service Worker registration, auto-update polling (every 60s), and auto-reload on new activation.

```javascript
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('SW registered!', reg);
            reg.update();
            setInterval(() => reg.update(), 60000);
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            if (navigator.serviceWorker.controller) {
                                console.log('New version activated, reloading...');
                                window.location.reload();
                            }
                        }
                    });
                }
            });
        }).catch(err => console.log('SW registration failed', err));
    });
}
```

---

## Script Block 2 — Lines 386–402
**Description**: `showLegal(type)` — fetches terms.txt or privacy.txt and displays via iosAlert.

```javascript
async function showLegal(type) {
    let file = type === 'terms' ? 'terms.txt' : 'privacy.txt';
    let title = type === 'terms' ? 'Terms of Use' : 'Privacy Policy';
    try {
        const response = await fetch(file);
        if (!response.ok) {
            throw new Error('Failed to load legal text');
        }
        const text = await response.text();
        iosAlert(text, title);
    } catch (error) {
        console.error('Error fetching legal text:', error);
        iosAlert('Could not load the document at this time. Please check your connection.', 'Error');
    }
}
```

---

## Script Block 3 — Lines 628–693
**Description**: Add Item modal controls.

### `openAddModal()` (lines 629-644)
Clears form fields, shows the add modal overlay with fade-in animation.

### `closeAddModal()` (lines 646-654)
Hides the add modal overlay with fade-out animation (300ms delay).

### `saveNewItem()` (lines 656-692)
Reads form fields (generic, brand, stock, price, exp), validates (generic required, MM/YYYY format), creates an inventory item object, adds to Dexie DB, closes modal, and refreshes lists.

---

## Script Block 4 — Lines 744–797 (Single ~105KB obfuscated line 745 + 3 lines of clear code)
**Description**: Heavily obfuscated core application JavaScript. Contains the entire app runtime: Dexie DB schema, all CRUD operations, cart management, checkout logic, SC/PWD discount math, expense management, inventory render, iOS-style modals (alert/confirm/prompt), premium/license system, screen navigation, date/time live updates, and more.

**Note**: Line 745 is a single 105KB line of obfuscated/minified JavaScript. The clear code at lines 746-797 patches localStorage.setItem for persistence backup and intercepts window.onload for license/deviceID restore.

### Functions identified in the obfuscated code:
| Function | Purpose |
|---|---|
| `getDeviceID()` | Generates/retrieves device ID from localStorage |
| `generateSignature(deviceId, date)` | HMAC-SHA256 signature for license validation |
| `validateLicenseKey(key)` | Validates license key format `deviceId-YYYYMMDD-HEX16` |
| `checkPremiumStatus()` | Checks localStorage license, sets `isPremium` flag |
| `updatePremiumUI()` | Updates premium badge UI element |
| `closeIosModal()` | Closes iOS-style modal |
| `showIosModal({title, message, type, ...})` | Shows iOS-style alert/confirm/prompt modal (returns Promise) |
| `iosAlert(msg, title)` | Shorthand for alert modal |
| `iosConfirm(msg, title)` | Shorthand for confirm modal |
| `iosPrompt(msg, title, defaultValue)` | Shorthand for prompt modal |
| `seedData()` | Seeds initial inventory with sample items |
| `getInventoryWithSales()` | Joins inventory with sales data |
| `loadInventory(filter)` | Loads and renders inventory list |
| `handleSortChange()` | Handles sort dropdown changes |
| `sortItemsArray(items, sortKey)` | Sorts items by stock/sold/name/expiry |
| `filterInventory()` | Filters inventory by search input and sort |
| `clearSearch()` | Clears search input and re-renders |
| `renderInventoryList(items)` | Renders inventory list HTML |
| `processReturnPrompt(itemId)` | Handles item return via prompt |
| `addToCart(itemId)` | Adds item to cart |
| `renderCart()` | Renders cart items in drawer |
| `clearCart()` | Clears the cart |
| `handleDiscountToggle()` | Handles SC/PWD discount toggle |
| `lookupDiscountId(value)` | Looks up SC/PWD discount ID |
| `cancelDiscountModal()` | Cancels discount modal |
| `confirmDiscountModal()` | Confirms discount and applies |
| `checkout()` | Completes checkout, saves sale record |
| `saveExpense()` | Saves an expense record |
| `deleteExpense(id)` | Deletes an expense record |
| `loadExpenses()` | Loads and renders expenses list |
| `renderInventoryStatus()` | Renders inventory status screen |
| `deleteInventoryItem(id)` | Deletes inventory item with confirmation |
| `editInventoryItem(id)` | Opens edit modal with item data |
| `closeEditModal()` | Closes edit modal |
| `saveEditedItem()` | Saves edited inventory item |
| `toggleMenu()` | Toggles sidebar menu |
| `openDrawer()` | Opens cart drawer |
| `closeDrawer()` | Closes cart drawer |
| `showMiniCart()` | Shows floating mini cart |
| `hideMiniCart()` | Hides floating mini cart |
| `updateDateTime()` | Updates date/time display every second |
| `showDashboard()` | Shows dashboard screen, hides others |
| `showInventory()` | Shows inventory screen |
| `showLedger()` | Shows ledger screen |
| `showExpenses()` | Shows expenses screen |
| `updateDashboardStats()` | Updates dashboard stats and transaction log |
| `showTransactionDetails(type, id)` | Shows transaction detail modal |
| `normalizeExpiry(value)` | Normalizes expiry date format |
| `updateMenuHighlight(screen)` | Updates nav menu highlight |

### Clear code (lines 746-796):
```javascript
// Premium persistence backup logic (patched)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'stashRx_license' || key === 'stashRx_deviceID') {
        try {
            const sys = new Dexie('stashRxSys');
            sys.version(1).stores({ settings: 'id' });
            sys.settings.put({id: key, value: value});
        } catch(e) {}
    }
};

// Intercept onload to guarantee restore finishes before app init
const originalOnload = window.onload || seedData;
window.onload = async function(e) {
    try {
        const sys = new Dexie('stashRxSys');
        sys.version(1).stores({ settings: 'id' });
        // Restore Device ID first
        if (!localStorage.getItem('stashRx_deviceID')) { /* restore logic */ }
        // Restore License next
        if (!localStorage.getItem('stashRx_license')) { /* restore logic */ }
    } catch(err) { console.error("Restore failed", err); }
    if (typeof originalOnload === 'function') { originalOnload(e); }
    if (typeof checkPremiumStatus === 'function') checkPremiumStatus();
};
```

---

## Script Block 5 — Lines 799–813
**Description**: Polling loop — updates the "Unlock Premium" badge text to "PRO ACTIVATED" if `isPremium` is true.

```javascript
setInterval(() => {
    if (typeof isPremium !== 'undefined') {
        const badge = document.getElementById('manualProBadge');
        if (badge) {
            if (isPremium) {
                badge.innerText = 'PRO ACTIVATED';
                badge.classList.remove('bg-emerald-100', 'text-emerald-700');
                badge.classList.add('bg-gray-900', 'text-amber-400', 'pointer-events-none');
                badge.onclick = null;
            }
        }
    }
}, 1000);
```

---

## Script Block 6 — Lines 815–831
**Description**: Auto-set dashboard date inputs to current local date on DOMContentLoaded.

```javascript
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');
    if (startInput && !startInput.value) startInput.value = dateStr;
    if (endInput && !endInput.value) endInput.value = dateStr;
});
```

---

## Script Block 7 — Lines 834–1007
**Description**: Chart.js integration — cashflow bar chart and top-10 fast-moving items horizontal bar chart.

### Functions:
| Function | Lines | Purpose |
|---|---|---|
| `updateCharts()` | 839-973 | Reads sales/expenses from Dexie, groups by day within date range, creates/updates cashflow (bar) and top-items (horizontal bar) Chart.js charts. Falls back to create vs update pattern. |
| `openAnalyticsModal()` | 977-992 | Opens analytics modal drawer, triggers `updateCharts()` after 300ms for proper canvas dimensions. |
| `closeAnalyticsModal()` | 994-1002 | Closes analytics modal drawer with animation. |

Line 1005 restores the original `updateDashboardStats`:
```javascript
window.updateDashboardStats = originalUpdateDashboardStats;
```

---

## Script Block 8 — Lines 1053–1232
**Description**: Data export/import functions using SheetJS (XLSX).

### `exportData()` (lines 1055-1101)
Exports inventory, sales, expenses, customers, and system config tables to a multi-sheet XLSX file. Sales items/discountDetails are JSON-stringified. License/deviceID excluded.

### `getSheetCaseInsensitive(workbook, name)` (lines 1103-1106)
Helper to find a sheet by case-insensitive name.

### `handleImport(event)` (lines 1109-1231)
Imports from XLSX file. Supports multi-sheet format and legacy single-sheet format. Reads inventory, sales, expenses, customers, system_config sheets. Enforces 100-item limit for non-premium users. Clears and bulk-adds data. Refreshes UI.

---

## Script Block 9 — Lines 1234–1268
**Description**: Import defense layer — protects against obfuscated bypass of 100-item limit.

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Layer 3: Replace file input element entirely
    var oldInput = document.getElementById('importFile');
    if (oldInput) {
        var newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.id = 'importFile';
        newInput.accept = '.xlsx, .xls, .csv';
        newInput.className = 'hidden';
        newInput.addEventListener('change', function(evt) {
            if (typeof window.handleImport === 'function') {
                window.handleImport(evt);
            }
        });
        oldInput.parentNode.replaceChild(newInput, oldInput);
    }
    // Layer 4: Neuter obfuscated processImportedData
    if (typeof processImportedData === 'function') {
        window.processImportedData = async function() { return; };
        try { processImportedData = async function() { return; }; } catch(e) {}
    }
});
```

---

## Script Block 10 — Lines 1273–1571
**Description**: Cloud sync (Firebase Storage), settings menu navigation, license/activation system.

### Functions:
| Function | Lines | Purpose |
|---|---|---|
| `(async function() { ... })()` | 1278-1352 | IIFE — loads Firebase SDK dynamically, signs in anonymously, sets up background sync every 5 minutes (premium only). Stores JSON backup in Firebase Storage. |
| `manualSyncToCloud()` | 1358-1403 | Manual cloud sync — checks online, premium, Firebase ready; uploads all data to Firebase Storage as JSON. |
| `restoreFromCloud()` | 1405-1464 | Restore from cloud — confirms, downloads JSON backup from Firebase Storage, clears all DB tables, bulk-adds restored data, refreshes UI. |
| `resetSettingsMenu()` | 1467-1472 | Resets settings sub-menu to closed state. |
| `toggleSettingsMenu()` | 1474-1485 | Toggles settings sub-menu slide. |
| `validateLicenseKey(key)` | 1491-1510 | Validates license key format: `deviceId-YYYYMMDD-HEX16`, checks expiry date. |
| `checkPremiumStatus()` | 1512-1526 | Reads license from localStorage, validates, sets `isPremium` flag, calls `updatePremiumUI()`. |
| `showPremiumModal()` | 1528-1559 | Shows device ID, prompts for license key, validates and activates premium. |
| `(function() { ... })()` | 1562-1568 | IIFE — runs `checkPremiumStatus()` on DOMContentLoaded or immediately. |
