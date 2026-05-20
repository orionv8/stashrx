import sys

# Read the file
with open('/home/orionv888/.hermes/mockups/stashrx/app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert the button
export_btn_html = """                <button onclick="exportData()" class="w-full py-2 bg-gray-50 rounded-lg text-gray-600 text-sm font-medium active:bg-gray-100 flex justify-center items-center gap-1.5 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Export Backup
                </button>"""

restore_btn_html = export_btn_html + """
                <button onclick="restoreFromCloud()" class="mt-2 w-full py-2 bg-gray-50 rounded-lg text-gray-600 text-sm font-medium active:bg-gray-100 flex justify-center items-center gap-1.5 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path><polyline points="21 18 21 12 15 12"></polyline></svg>
                    Restore from Cloud
                </button>"""

if export_btn_html in content:
    content = content.replace(export_btn_html, restore_btn_html)
    print("Button injected successfully.")
else:
    print("Export button HTML not found!")
    sys.exit(1)

# 2. Insert the function before the closing </script> tag at the end of the file.
# Wait, let's find the last occurrence of </script>
last_script_tag_pos = content.rfind('</script>')
if last_script_tag_pos == -1:
    print("</script> not found!")
    sys.exit(1)

restore_function = """
    async function restoreFromCloud() {
        if (typeof isPremium === 'undefined' || !isPremium) {
            iosAlert("Cloud Restore is a Premium feature. Please unlock the app to use it.", "Premium Required");
            return;
        }

        const confirmed = await iosConfirm("This will ERASE all current data on this device and replace it with your last cloud backup. Are you sure you want to proceed?", "Confirm Restore");
        if (!confirmed) {
            return;
        }

        try {
            const deviceId = getDeviceID();
            const fdb = firebase.firestore();
            const docRef = fdb.collection('stashRx_Backups').doc(deviceId);
            const doc = await docRef.get();

            if (!doc.exists) {
                iosAlert("No cloud backup could be found for this Device ID.", "Error");
                return;
            }

            const backupData = doc.data();

            await db.transaction('rw', db.inventory, db.sales, db.expenses, db.customers, async () => {
                await db.inventory.clear();
                await db.sales.clear();
                await db.expenses.clear();
                await db.customers.clear();

                const inventoryData = JSON.parse(backupData.inventory || '[]');
                const salesData = JSON.parse(backupData.sales || '[]');
                const expensesData = JSON.parse(backupData.expenses || '[]');
                const customersData = JSON.parse(backupData.customers || '[]');

                if (inventoryData.length > 0) await db.inventory.bulkAdd(inventoryData);
                if (salesData.length > 0) await db.sales.bulkAdd(salesData);
                if (expensesData.length > 0) await db.expenses.bulkAdd(expensesData);
                if (customersData.length > 0) await db.customers.bulkAdd(customersData);
            });

            iosAlert("Restore complete! Your data has been restored from the cloud.", "Success");
            
            if (typeof loadInventory === 'function') { await loadInventory(); }
            if (typeof updateDashboardStats === 'function') { await updateDashboardStats(); }
            if (typeof renderInventoryStatus === 'function') { await renderInventoryStatus(); }

        } catch (err) {
            console.error("Cloud restore failed:", err);
            iosAlert("An error occurred while restoring your data. Please check your internet connection.", "Error");
        }
    }
"""

content = content[:last_script_tag_pos] + restore_function + "\n" + content[last_script_tag_pos:]

with open('/home/orionv888/.hermes/mockups/stashrx/app.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Function injected successfully.")
