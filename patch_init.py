import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# We want to replace the block starting at `// Premium persistence backup logic`
# to the end of the script tag before `</script>`

pattern = r"// Premium persistence backup logic.*?window\['onload'\]=seedData;"

replacement = """// Premium persistence backup logic
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
        if (!localStorage.getItem('stashRx_deviceID')) {
            let savedDevId = await sys.settings.get('stashRx_deviceID');
            if (!savedDevId) savedDevId = await sys.settings.get('stashRx_deviceId'); // fallback
            if (savedDevId && savedDevId.value) {
                originalSetItem.call(localStorage, 'stashRx_deviceID', savedDevId.value);
            }
        }
        
        // Restore License next
        if (!localStorage.getItem('stashRx_license')) {
            const savedLic = await sys.settings.get('stashRx_license');
            if (savedLic && savedLic.value) {
                originalSetItem.call(localStorage, 'stashRx_license', savedLic.value);
            } else {
                const oldLic = await sys.settings.get('license');
                if (oldLic && oldLic.key) {
                    originalSetItem.call(localStorage, 'stashRx_license', oldLic.key);
                }
            }
        }
    } catch(err) {
        console.error("Restore failed", err);
    }
    
    // Now safely boot the app
    if (typeof originalOnload === 'function') {
        originalOnload(e);
    }
};"""

updated, count = re.subn(pattern, replacement, content, flags=re.DOTALL)

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(updated)

print(f"Patched! Replacements: {count}")
