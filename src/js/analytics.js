// Analytics: Chart.js dashboard charts
import { db } from './db.js';
import { formatCurrency } from './utils.js';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

let cashflowChart = null;
let topItemsChart = null;

async function updateCharts() {
  const canvas1 = document.getElementById('cashflowChart');
  const canvas2 = document.getElementById('topItemsChart');
  if (!canvas1 || !canvas2) return;

  try {
    const allSales = await db.sales.toArray();
    const allExpenses = await db.expenses.toArray();

    // Aggregate by date
    const dateMap = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[key] = { sales: 0, expenses: 0 };
    }

    allSales.forEach(s => {
      const d = new Date(s.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateMap[key]) dateMap[key].sales += s.total || 0;
    });
    allExpenses.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateMap[key]) dateMap[key].expenses += e.amount || 0;
    });

    const labels = Object.keys(dateMap);
    const salesData = labels.map(l => dateMap[l].sales);
    const expensesData = labels.map(l => dateMap[l].expenses);

    if (cashflowChart) cashflowChart.destroy();
    cashflowChart = new Chart(canvas1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Sales', data: salesData, backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Expenses', data: expensesData, backgroundColor: '#ef4444', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => '₱' + v } } }
      }
    });

    // Top 10 fast-moving items
    const itemMap = {};
    allSales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = 0;
        itemMap[item.name] += item.qty || 0;
      });
    });

    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topItemsChart) topItemsChart.destroy();
    topItemsChart = new Chart(canvas2, {
      type: 'bar',
      data: {
        labels: topItems.map(i => i[0]),
        datasets: [{
          label: 'Units Sold',
          data: topItems.map(i => i[1]),
          backgroundColor: '#10b981',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  } catch (e) {
    console.error('updateCharts error:', e);
  }
}

function openAnalyticsModal() {
  const overlay = document.getElementById('analyticsModalOverlay');
  const card = document.getElementById('analyticsModalCard');
  if (!overlay || !card) return;
  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
  card.classList.remove('translate-y-full');
  card.classList.add('translate-y-0');
  setTimeout(() => updateCharts(), 300);
}

function closeAnalyticsModal() {
  const overlay = document.getElementById('analyticsModalOverlay');
  const card = document.getElementById('analyticsModalCard');
  if (!overlay || !card) return;
  overlay.classList.add('opacity-0');
  card.classList.remove('translate-y-0');
  card.classList.add('translate-y-full');
  setTimeout(() => overlay.classList.add('hidden'), 200);
}

export { updateCharts, openAnalyticsModal, closeAnalyticsModal };
