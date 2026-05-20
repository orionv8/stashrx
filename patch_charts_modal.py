import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# 1. Remove the inline charts section
chart_section_regex = re.compile(
    r'\s*<!-- Charts Section -->\s*<div class="mb-6 space-y-4">.*?</div>\s*</div>\s*',
    re.DOTALL
)
content = chart_section_regex.sub('\n            ', content)

# 2. Add the trigger button to the dashboard
button_html = """
            <!-- Analytics Button -->
            <button onclick="openAnalyticsModal()" class="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold py-3 rounded-xl shadow-sm mb-4 active:scale-95 transition flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                View Analytics Charts
            </button>
            <div id="dashboardReportList" class="space-y-3">
"""
content = content.replace('<div id="dashboardReportList" class="space-y-3">', button_html)

# 3. Add the Modal HTML just before the <script> tags at the end of the body
modal_html = """
    <!-- Analytics Modal -->
    <div id="analyticsModalOverlay" class="fixed inset-0 bg-black/40 z-50 hidden opacity-0 transition-opacity duration-200 flex justify-center items-end sm:items-center">
        <div id="analyticsModalCard" class="bg-[#F2F2F7] w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col transform translate-y-full sm:translate-y-0 transition-transform duration-300 shadow-xl overflow-hidden">
            <div class="flex justify-between items-center p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <h2 class="text-lg font-bold text-gray-900">Dashboard Analytics</h2>
                <button onclick="closeAnalyticsModal()" class="bg-gray-100 text-gray-500 w-8 h-8 rounded-full flex items-center justify-center font-bold active:bg-gray-200">✕</button>
            </div>
            <div class="p-4 overflow-y-auto space-y-4">
                <div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Revenue vs Expenses</h3>
                    <div class="relative h-[250px] w-full">
                        <canvas id="chartCashflow"></canvas>
                    </div>
                </div>
                <div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Top 10 Fast Moving</h3>
                    <div class="relative h-[300px] w-full">
                        <canvas id="chartTopItems"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>
"""

content = content.replace('</body>', modal_html + '\n</body>')

# 4. Modify the JS: add open/close modal functions and remove the auto-hook on updateDashboardStats
# Find the JS block at the end and replace it
new_js_block = """
function openAnalyticsModal() {
    const overlay = document.getElementById('analyticsModalOverlay');
    const card = document.getElementById('analyticsModalCard');
    overlay.classList.remove('hidden');
    // Force reflow
    void overlay.offsetWidth;
    overlay.classList.remove('opacity-0');
    card.classList.remove('translate-y-full');
    
    // Update charts after modal is visible to ensure proper rendering dimensions
    setTimeout(async () => {
        try {
            await updateCharts();
        } catch(e) { console.error("Chart Error", e); }
    }, 300);
}

function closeAnalyticsModal() {
    const overlay = document.getElementById('analyticsModalOverlay');
    const card = document.getElementById('analyticsModalCard');
    overlay.classList.add('opacity-0');
    card.classList.add('translate-y-full');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 200);
}

// Remove the hook that runs updateCharts automatically on updateDashboardStats
window.updateDashboardStats = originalUpdateDashboardStats;
"""

# We'll replace everything from "// Hook into the existing updateDashboardStats" to the end of the script tag
hook_regex = re.compile(r'// Hook into the existing updateDashboardStats.*?</script>', re.DOTALL)
content = hook_regex.sub(new_js_block + '\n</script>', content)

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(content)

print("Modal logic injected successfully")
