import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# First, remove the old patch script from app.html
content = re.sub(r'<script>\s*// Override Export Data.*?// reset file input\n};\n</script>', '', content, flags=re.DOTALL)

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

function getSheetCaseInsensitive(workbook, name) {
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === name.toLowerCase());
    return sheetName ? workbook.Sheets[sheetName] : null;
}

// Override Import Data to read all tables robustly
window.handleImport = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            
            // Legacy fallback: if there is only 1 sheet and it's not named one of the known tables,
            // assume it's the inventory.
            const isLegacy = workbook.SheetNames.length === 1 && 
                            !['inventory', 'sales', 'expenses', 'customers', 'system_config'].includes(workbook.SheetNames[0].toLowerCase());
            
            const sysSheet = getSheetCaseInsensitive(workbook, 'System_Config');
            if (sysSheet) {
                const sysData = XLSX.utils.sheet_to_json(sysSheet);
                for (let item of sysData) {
                    if (item.key && item.value) {
                        localStorage.setItem(String(item.key), String(item.value));
                    }
                }
            }
            
            const invSheet = isLegacy ? workbook.Sheets[workbook.SheetNames[0]] : getSheetCaseInsensitive(workbook, 'inventory');
            if (invSheet) {
                let invData = XLSX.utils.sheet_to_json(invSheet);
                let validInv = invData.filter(i => i.id !== undefined && i.id !== '');
                validInv = validInv.map(i => {
                    return {
                        ...i,
                        id: parseInt(i.id),
                        stock: parseFloat(i.stock) || 0,
                        price: parseFloat(i.price) || 0,
                        exp: i.exp instanceof Date ? 
                             (String(i.exp.getMonth()+1).padStart(2,'0') + '/' + i.exp.getFullYear()) : 
                             String(i.exp || '')
                    };
                }).filter(i => !isNaN(i.id));
                
                if (validInv.length) {
                    await db.inventory.clear();
                    await db.inventory.bulkAdd(validInv);
                }
            }
            
            const salesSheet = getSheetCaseInsensitive(workbook, 'sales');
            if (salesSheet) {
                let salesData = XLSX.utils.sheet_to_json(salesSheet);
                let validSales = salesData.filter(s => s.id !== undefined && s.id !== '');
                let processed = validSales.map(s => {
                    if (s.items && typeof s.items === 'string') {
                        try { s.items = JSON.parse(s.items); } catch(err) { s.items = []; }
                    }
                    if (s.discountDetails && typeof s.discountDetails === 'string') {
                        try { s.discountDetails = JSON.parse(s.discountDetails); } catch(err) { s.discountDetails = {}; }
                    }
                    return {
                        ...s,
                        id: parseInt(s.id),
                        total: parseFloat(s.total) || 0
                    };
                }).filter(s => !isNaN(s.id));
                if (processed.length) {
                    await db.sales.clear();
                    await db.sales.bulkAdd(processed);
                }
            }
            
            const expSheet = getSheetCaseInsensitive(workbook, 'expenses');
            if (expSheet) {
                let expData = XLSX.utils.sheet_to_json(expSheet);
                let validExp = expData.filter(e => e.id !== undefined && e.id !== '');
                validExp = validExp.map(e => ({
                    ...e,
                    id: parseInt(e.id),
                    amount: parseFloat(e.amount) || 0
                })).filter(e => !isNaN(e.id));
                if (validExp.length) {
                    await db.expenses.clear();
                    await db.expenses.bulkAdd(validExp);
                }
            }
            
            const cusSheet = getSheetCaseInsensitive(workbook, 'customers');
            if (cusSheet) {
                let cusData = XLSX.utils.sheet_to_json(cusSheet);
                let validCus = cusData.filter(c => c.idNumber !== undefined && c.idNumber !== '');
                validCus = validCus.map(c => ({
                    ...c,
                    idNumber: String(c.idNumber)
                }));
                if (validCus.length) {
                    await db.customers.clear();
                    await db.customers.bulkAdd(validCus);
                }
            }
            
            if(typeof loadInventory === 'function') await loadInventory();
            if(typeof updateDashboardStats === 'function') await updateDashboardStats();
            if(typeof renderInventoryStatus === 'function') await renderInventoryStatus();
            
            if(typeof iosAlert !== 'undefined') iosAlert('Import completed successfully! Refresh the page if some lists do not update.', 'Success');
            else alert('Import completed successfully! Refresh the page to see changes.');
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

content = content.replace("</body>", script_to_append + "\n</body>")

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(content)

print("Applied V2 patch to handle legacy sheets and data typing robustly.")
