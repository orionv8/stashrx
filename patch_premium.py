import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# Add checkPremiumStatus call to handleImport
content = content.replace("if(typeof renderInventoryStatus === 'function') await renderInventoryStatus();", "if(typeof renderInventoryStatus === 'function') await renderInventoryStatus();\n            if(typeof checkPremiumStatus === 'function') await checkPremiumStatus();")

# Append the Premium persistence logic back before </body>
persistence_logic = """
<script>
// Premium persistence backup logic
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'stashRx_license') {
        try {
            const sys = new Dexie('stashRxSys');
            sys.version(1).stores({ settings: 'id' });
            sys.settings.put({id: 'license', key: value});
        } catch(e) {}
    }
};
(async function() {
    if (!localStorage.getItem('stashRx_license')) {
        try {
            const sys = new Dexie('stashRxSys');
            sys.version(1).stores({ settings: 'id' });
            const saved = await sys.settings.get('license');
            if (saved && saved.key) {
                originalSetItem.call(localStorage, 'stashRx_license', saved.key);
                if (typeof checkPremiumStatus === 'function') checkPremiumStatus();
            }
        } catch(e) {}
    }
})();
</script>
"""

content = content.replace("</body>", persistence_logic + "\n</body>")

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(content)
