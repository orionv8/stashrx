import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# I will append the overrides at the end, just before </body>
# But wait, earlier I appended a debug script. I should replace it or just append.

script_to_append = """
<script>
// Override Export Data to include all tables
window.exportData = async function() {
    try {
        const inventory = await db.inventory.toArray();
        const sales = await db.sales.toArray();
        const expenses = await db.expenses.toArray();
        const customers = await db.customers.toArray();
        
        const systemConfig = [
            { key: 'stashRx_deviceID', value: localStorage.getItem('stashRx_deviceID') || '' },
            { key: 'stashRx_license', value: localStorage.getItem('stashRx_license') || '' }
        ];

        const processedSales = sales.map(s => {
            return {
                ...s,
                items: JSON.stringify(s.items || []),
                discountDetails: JSON.stringify(s.discountDetails || {})
            };
        });

        const wb = XLSX.utils.book_new();
        
        const wsInv = XLSX.utils.json_to_sheet(inventory.length ? inventory : [{id:'', generic:'', brand:'', stock:'', exp:'', price:''}]);
        XLSX.utils.book_append_sheet(wb, wsInv, "inventory");
        
        const wsSales = XLSX.utils.json_to_sheet(processedSales.length ? processedSales : [{id:'', date:'', total:'', items:'', discountDetails:''}]);
        XLSX.utils.book_append_sheet(wb, wsSales, "sales");
        
        const wsExpenses = XLSX.utils.json_to_sheet(expenses.length ? expenses : [{id:'', date:'', amount:'', category:'', description:''}]);
        XLSX.utils.book_append_sheet(wb, wsExpenses, "expenses");
        
        const wsCustomers = XLSX.utils.json_to_sheet(customers.length ? customers : [{idNumber:'', name:'', address:''}]);
        XLSX.utils.book_append_sheet(wb, wsCustomers, "customers");
        
        const wsSys = XLSX.utils.json_to_sheet(systemConfig);
        XLSX.utils.book_append_sheet(wb, wsSys, "System_Config");
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `StashRx_Backup_${dateStr}.xlsx`);
        
        if(typeof iosAlert !== 'undefined') iosAlert('Backup exported successfully. All data sheets included.', 'Export Complete');
        else alert('Backup exported successfully.');
    } catch(err) {
        console.error("Export Error:", err);
        if(typeof iosAlert !== 'undefined') iosAlert('Error exporting data: ' + err.message, 'Error');
        else alert('Error exporting data: ' + err.message);
    }
};

// Override Import Data to read all tables
window.handleImport = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            if (workbook.Sheets['System_Config']) {
                const sysData = XLSX.utils.sheet_to_json(workbook.Sheets['System_Config']);
                for (let item of sysData) {
                    if (item.key && item.value) {
                        localStorage.setItem(item.key, item.value);
                    }
                }
            }
            
            if (workbook.Sheets['inventory']) {
                const invData = XLSX.utils.sheet_to_json(workbook.Sheets['inventory']);
                const validInv = invData.filter(i => i.id !== undefined && i.id !== '');
                if (validInv.length) {
                    await db.inventory.clear();
                    await db.inventory.bulkAdd(validInv);
                }
            }
            if (workbook.Sheets['sales']) {
                const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['sales']);
                const validSales = salesData.filter(s => s.id !== undefined && s.id !== '');
                const processed = validSales.map(s => {
                    if (s.items && typeof s.items === 'string') {
                        try { s.items = JSON.parse(s.items); } catch(err) {}
                    }
                    if (s.discountDetails && typeof s.discountDetails === 'string') {
                        try { s.discountDetails = JSON.parse(s.discountDetails); } catch(err) {}
                    }
                    return s;
                });
                if (processed.length) {
                    await db.sales.clear();
                    await db.sales.bulkAdd(processed);
                }
            }
            if (workbook.Sheets['expenses']) {
                const expData = XLSX.utils.sheet_to_json(workbook.Sheets['expenses']);
                const validExp = expData.filter(e => e.id !== undefined && e.id !== '');
                if (validExp.length) {
                    await db.expenses.clear();
                    await db.expenses.bulkAdd(validExp);
                }
            }
            if (workbook.Sheets['customers']) {
                const cusData = XLSX.utils.sheet_to_json(workbook.Sheets['customers']);
                const validCus = cusData.filter(c => c.idNumber !== undefined && c.idNumber !== '');
                if (validCus.length) {
                    await db.customers.clear();
                    await db.customers.bulkAdd(validCus);
                }
            }
            
            if(typeof loadInventory === 'function') loadInventory();
            if(typeof updateDashboardStats === 'function') updateDashboardStats();
            if(typeof iosAlert !== 'undefined') iosAlert('Import completed successfully! All data has been updated.', 'Success');
            else alert('Import completed successfully!');
        } catch(err) {
            console.error(err);
            if(typeof iosAlert !== 'undefined') iosAlert('Import failed: ' + err.message, 'Error');
            else alert('Import failed: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // reset file input
};
</script>
"""

# Replace the previous debug script to avoid clutter, or just append
if "console.log(\"Global DB instance:" in content:
    # remove the previous debug addition
    content = re.sub(r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/xlsx/0\.18\.5/xlsx\.full\.min\.js"></script>\n<script>\nconsole\.log\("Global DB instance:.*?</script>', '', content, flags=re.DOTALL)

content = content.replace("</body>", script_to_append + "\n</body>")

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(content)

print("Patched handleImport and exportData!")
