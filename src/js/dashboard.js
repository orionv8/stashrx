// Dashboard: stats and transaction log
import { db } from './db.js';
import { formatCurrency } from './utils.js';
import { escapeHtml } from './inventory.js';

async function updateDashboardStats() {
  try {
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');
    const startDate = startInput ? new Date(startInput.value + 'T00:00:00') : new Date();
    const endDate = endInput ? new Date(endInput.value + 'T23:59:59') : new Date();

    if (!startInput || !endInput || !startInput.value || !endInput.value) return;

    const allSales = await db.sales.toArray();
    const allExpenses = await db.expenses.toArray();

    const filteredSales = allSales.filter(s => {
      const d = new Date(s.date);
      return d >= startDate && d <= endDate;
    });
    const filteredExpenses = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    const salesTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = salesTotal - expensesTotal;

    // Update stat cards
    const salesEl = document.getElementById('statTodaySales');
    if (salesEl) {
      salesEl.textContent = formatCurrency(salesTotal);
      salesEl.className = 'text-[22px] font-bold ' + (salesTotal >= 0 ? 'text-emerald-600' : 'text-red-600');
    }
    const expEl = document.getElementById('statTodayExp');
    if (expEl) {
      expEl.textContent = formatCurrency(expensesTotal);
      expEl.className = 'text-[22px] font-bold ' + (expensesTotal >= 0 ? 'text-red-600' : 'text-emerald-600');
    }
    const profitEl = document.getElementById('statTotalProfit');
    if (profitEl) {
      profitEl.textContent = formatCurrency(profit);
      profitEl.className = 'text-[22px] font-bold ' + (profit >= 0 ? 'text-emerald-600' : 'text-red-600');
    }

    // Render transaction log
    const logContainer = document.getElementById('dashboardReportList');
    if (logContainer) {
      const allItems = [
        ...filteredSales.map(s => ({ ...s, _type: 'Sales', _amount: s.total || 0, _desc: s.items ? s.items.map(i => i.name).join(', ') : 'Sale' })),
        ...filteredExpenses.map(e => ({ ...e, _type: 'Expense', _amount: e.amount || 0, _desc: e.description || 'Expense' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      if (allItems.length === 0) {
        logContainer.innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">No transactions in this period</div>';
      } else {
        logContainer.innerHTML = allItems.map(item => `
          <div class="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <div class="font-semibold text-[14px] text-gray-900">${escapeHtml(item._desc)}</div>
              <div class="text-[12px] text-gray-400">${new Date(item.date).toLocaleDateString()}</div>
            </div>
            <span class="font-bold text-[16px] ${item._type === 'Sales' ? 'text-emerald-600' : 'text-red-500'}">${item._type === 'Sales' ? '' : '-'}${formatCurrency(item._amount)}</span>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('updateDashboardStats error:', e);
  }
}

export { updateDashboardStats };
