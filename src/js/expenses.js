// Expenses CRUD
import { db } from './db.js';
import { formatCurrency } from './utils.js';

async function saveExpense() {
  const category = document.getElementById('expCategory').value;
  const description = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value) || 0;

  if (!description || amount <= 0) {
    alert('Please enter description and amount.');
    return;
  }

  await db.expenses.add({
    category,
    description,
    amount,
    date: new Date().toISOString()
  });

  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  renderExpenses();
}

async function renderExpenses() {
  const container = document.getElementById('expensesList');
  if (!container) return;
  try {
    const expenses = await db.expenses.reverse().sortBy('date');
    container.innerHTML = expenses.map(exp => `
      <div class="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
        <div>
          <div class="font-semibold text-[14px] text-gray-900">${escapeHtml(exp.description)}</div>
          <div class="text-[12px] text-gray-400">${escapeHtml(exp.category)} • ${new Date(exp.date).toLocaleDateString()}</div>
        </div>
        <span class="font-bold text-[16px] text-red-500">${formatCurrency(exp.amount)}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('renderExpenses error:', e);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m);
}

export { saveExpense, renderExpenses };
