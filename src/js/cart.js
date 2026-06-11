// Cart: state, add/remove, checkout, discount, payment
import { db } from './db.js';
import { formatCurrency, iosAlert, iosConfirm } from './utils.js';

// Cart state
let cart = [];
let pwdDiscountActive = false;

function updateMiniCart() {
  const totalQty = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);

  const miniCart = document.getElementById('miniCart');
  const miniCount = document.getElementById('miniCount');
  const miniTotal = document.getElementById('miniTotal');

  if (totalQty === 0) {
    if (miniCart) miniCart.style.transform = 'translateY(96px)';
    if (miniCount) miniCount.textContent = '0';
    if (miniTotal) miniTotal.textContent = '₱0.00';
    return;
  }

  if (miniCart) miniCart.style.transform = 'translateY(0)';
  if (miniCount) miniCount.textContent = totalQty;
  if (miniTotal) miniTotal.textContent = formatCurrency(totalAmount);
}

function updateCartDrawer() {
  const container = document.getElementById('cartItemsList');
  const drawerTotal = document.getElementById('drawerTotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">Cart is empty</div>';
    if (drawerTotal) drawerTotal.textContent = '₱0.00';
    updateMiniCart();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
      <div class="flex-1">
        <div class="font-semibold text-[14px]">${escapeHtml(item.name)}</div>
        <div class="text-[13px] text-gray-500">${formatCurrency(item.price)} each</div>
      </div>
      <div class="flex items-center space-x-3">
        <button onclick="window.stashRx.updateCartItem(${item.id}, -1)" class="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[16px] font-bold active:bg-gray-200">−</button>
        <span class="font-semibold text-[16px] w-6 text-center">${item.qty}</span>
        <button onclick="window.stashRx.updateCartItem(${item.id}, 1)" class="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[16px] font-bold active:bg-emerald-200">+</button>
      </div>
    </div>
  `).join('');

  updateDrawerTotal();
  updateMiniCart();
}

function updateDrawerTotal() {
  const drawerTotal = document.getElementById('drawerTotal');
  if (!drawerTotal) return;

  const subtotal = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);

  if (pwdDiscountActive) {
    const vat = subtotal * 0.12 / 1.12;
    const netOfVat = subtotal - vat;
    const discount = netOfVat * 0.20;
    const total = subtotal - discount;
    drawerTotal.textContent = formatCurrency(total);

    // Update breakdown
    document.getElementById('bdSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('bdVat').textContent = '-' + formatCurrency(vat);
    document.getElementById('bdNetVat').textContent = formatCurrency(netOfVat);
    document.getElementById('bdDiscount').textContent = '-' + formatCurrency(discount);
  } else {
    drawerTotal.textContent = formatCurrency(subtotal);
  }
}

function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty = (existing.qty || 0) + 1;
  } else {
    cart.push({ id, name, qty: 1, price });
  }
  updateCartDrawer();
  openDrawer();
}

function updateCartItem(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = (item.qty || 0) + delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  updateCartDrawer();
}

function clearCart() {
  cart = [];
  pwdDiscountActive = false;
  const toggle = document.getElementById('pwdToggle');
  if (toggle) toggle.checked = false;
  document.getElementById('discountBreakdown').classList.add('hidden');
  updateCartDrawer();
  closeDrawer();
}

// Drawer controls
function openDrawer() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.remove('hidden');
  if (drawer) {
    drawer.classList.remove('drawer-closed');
    drawer.classList.add('drawer-open');
  }
  updateCartDrawer();
}

function closeDrawer() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = '';
  }
  if (drawer) {
    drawer.classList.remove('drawer-open');
    drawer.classList.add('drawer-closed');
  }
}

// Discount
function handleDiscountToggle() {
  const toggle = document.getElementById('pwdToggle');
  const breakdown = document.getElementById('discountBreakdown');
  pwdDiscountActive = toggle.checked;
  if (pwdDiscountActive) {
    breakdown.classList.remove('hidden');
    // Show discount modal
    document.getElementById('discountModalOverlay').classList.remove('hidden');
    document.getElementById('discountModalOverlay').classList.remove('opacity-0');
    document.getElementById('discountModalCard').classList.remove('scale-95');
  } else {
    breakdown.classList.add('hidden');
  }
  updateDrawerTotal();
}

function lookupDiscountId(value) {
  // In a real app, look up from DB. For now, just store the value.
}

function cancelDiscountModal() {
  const overlay = document.getElementById('discountModalOverlay');
  const card = document.getElementById('discountModalCard');
  overlay.classList.add('opacity-0');
  card.classList.add('scale-95');
  setTimeout(() => overlay.classList.add('hidden'), 200);
  // Uncheck toggle
  const toggle = document.getElementById('pwdToggle');
  if (toggle) toggle.checked = false;
  pwdDiscountActive = false;
  document.getElementById('discountBreakdown').classList.add('hidden');
  document.getElementById('discountIdInput').value = '';
  document.getElementById('discountNameInput').value = '';
  updateDrawerTotal();
}

function confirmDiscountModal() {
  const id = document.getElementById('discountIdInput').value;
  const name = document.getElementById('discountNameInput').value;
  if (!id) {
    iosAlert('Please enter SC/PWD ID number.', 'Required');
    return;
  }
  pwdDiscountActive = true;
  const toggle = document.getElementById('pwdToggle');
  if (toggle) toggle.checked = true;
  document.getElementById('discountBreakdown').classList.remove('hidden');
  const overlay = document.getElementById('discountModalOverlay');
  const card = document.getElementById('discountModalCard');
  overlay.classList.add('opacity-0');
  card.classList.add('scale-95');
  setTimeout(() => overlay.classList.add('hidden'), 200);
  updateDrawerTotal();
}

// Payment
function checkout() {
  const total = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
  if (total <= 0) {
    iosAlert('Cart is empty. Add items first.', 'Checkout');
    return;
  }
  // Show payment method selection
  document.getElementById('paymentModalOverlay').classList.remove('hidden');
  document.getElementById('paymentModalOverlay').classList.remove('opacity-0');
  document.getElementById('paymentModalCard').classList.remove('scale-95');
}

function selectPaymentMethod(method) {
  // Hide payment modal
  document.getElementById('paymentModalOverlay').classList.add('opacity-0');
  document.getElementById('paymentModalCard').classList.add('scale-95');
  setTimeout(() => document.getElementById('paymentModalOverlay').classList.add('hidden'), 200);

  if (method === 'Cash') {
    // Show cash entry modal
    const total = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
    let finalTotal = total;
    if (pwdDiscountActive) {
      const vat = total * 0.12 / 1.12;
      const netOfVat = total - vat;
      const discount = netOfVat * 0.20;
      finalTotal = total - discount;
    }
    document.getElementById('cashTotalDue').textContent = formatCurrency(finalTotal);
    document.getElementById('cashModalOverlay').classList.remove('hidden');
    document.getElementById('cashModalOverlay').classList.remove('opacity-0');
    document.getElementById('cashModalCard').classList.remove('scale-95');
  } else {
    // GCash/Other — process directly
    processPayment(method);
  }
}

function closePaymentModal() {
  document.getElementById('paymentModalOverlay').classList.add('opacity-0');
  document.getElementById('paymentModalCard').classList.add('scale-95');
  setTimeout(() => document.getElementById('paymentModalOverlay').classList.add('hidden'), 200);
}

function processCashPayment() {
  const cashInput = document.getElementById('cashAmount');
  const cash = parseFloat(cashInput.value) || 0;
  const total = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
  let finalTotal = total;
  if (pwdDiscountActive) {
    const vat = total * 0.12 / 1.12;
    const netOfVat = total - vat;
    const discount = netOfVat * 0.20;
    finalTotal = total - discount;
  }
  if (cash < finalTotal) {
    iosAlert('Insufficient cash amount.', 'Payment');
    return;
  }
  processPayment('Cash', cash, finalTotal);
}

function closeCashModal() {
  document.getElementById('cashModalOverlay').classList.add('opacity-0');
  document.getElementById('cashModalCard').classList.add('scale-95');
  setTimeout(() => document.getElementById('cashModalOverlay').classList.add('hidden'), 200);
}

function closeReceiptModal() {
  document.getElementById('receiptModalOverlay').classList.add('opacity-0');
  document.getElementById('receiptModalCard').classList.add('scale-95');
  setTimeout(() => document.getElementById('receiptModalOverlay').classList.add('hidden'), 200);
}

async function processPayment(method, cashAmount = 0, finalTotal) {
  try {
    const total = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
    let computedTotal = total;
    if (pwdDiscountActive) {
      const vat = total * 0.12 / 1.12;
      const netOfVat = total - vat;
      const discount = netOfVat * 0.20;
      computedTotal = total - discount;
    }
    const sale = {
      date: new Date().toISOString(),
      total: computedTotal,
      subtotal: total,
      method: method,
      pwdDiscounted: pwdDiscountActive,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }))
    };
    await db.sales.add(sale);

    // Deduct stock
    for (const item of cart) {
      const invItem = await db.inventory.get(item.id);
      if (invItem) {
        await db.inventory.update(item.id, { stock: Math.max(0, (invItem.stock || 0) - item.qty) });
      }
    }

    const change = method === 'Cash' ? cashAmount - computedTotal : 0;
    const receiptText = `Payment: ${method}\nTotal: ${formatCurrency(computedTotal)}${change > 0 ? '\nChange: ' + formatCurrency(change) : ''}\nThank you!`;

    // Hide cash modal
    closeCashModal();
    document.getElementById('receiptModalOverlay').classList.remove('hidden');
    document.getElementById('receiptModalOverlay').classList.remove('opacity-0');
    document.getElementById('receiptModalCard').classList.remove('scale-95');
    document.getElementById('receiptText').textContent = receiptText;

    cart = [];
    pwdDiscountActive = false;
    const toggle = document.getElementById('pwdToggle');
    if (toggle) toggle.checked = false;
    document.getElementById('discountBreakdown').classList.add('hidden');
    closeDrawer();
    updateMiniCart();
    loadInventory();
    renderInventoryStatus();
  } catch (e) {
    console.error('Payment error:', e);
    iosAlert('Payment failed. Please try again.', 'Error');
  }
}

async function loadInventory() {
  // Re-export needed by payment flow
  const { loadInventory: li } = await import('./inventory.js');
  return li();
}

async function renderInventoryStatus() {
  const { renderInventoryStatus: ris } = await import('./inventory.js');
  return ris();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m;
  });
}

export {
  cart,
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
  closeReceiptModal
};
