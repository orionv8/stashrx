import re

with open('app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace promptFirebaseConfig with an admin-only flow
old_prompt_logic = """async function promptFirebaseConfig() {
    let currentConfig = localStorage.getItem(FIREBASE_CONFIG_KEY) || "";
    let msg = `
        <div class="text-left text-sm mb-4 text-gray-600">
            <p class="mb-2"><strong>Enable Silent Cloud Sync</strong></p>
            <p class="mb-2">To back up your data silently in the background, enter your Firebase configuration object (JSON format) below.</p>
            <p class="text-xs">If you don't have one, leave this blank to continue using local storage only.</p>
        </div>
    `;
    let newConfig = await iosPrompt(msg, currentConfig, "Cloud Sync Setup");
    if (newConfig !== null) {
        if (newConfig.trim() === "") {
            localStorage.removeItem(FIREBASE_CONFIG_KEY);
            iosAlert("Cloud sync disabled. Operating in local-only mode.", "Cloud Sync");
        } else {
            try {
                // Remove javascript syntax if they copied it with const firebaseConfig =
                let cleanConfig = newConfig.replace(/const\\s+.*=\\s*/, '').replace(/;/g, '');
                JSON.parse(cleanConfig);
                localStorage.setItem(FIREBASE_CONFIG_KEY, cleanConfig);
                iosAlert("Firebase config saved! Reload the app to initialize sync.", "Success");
            } catch(e) {
                iosAlert("Invalid JSON format. Please ensure you only paste the JSON object starting with { and ending with }.", "Error");
            }
        }
    }
}"""

new_prompt_logic = """async function promptFirebaseConfig() {
    // Only allow Orion/Admin to configure the central Firebase
    const adminPass = await iosPrompt("Enter Admin Password to configure Cloud Sync:", "", "Admin Access");
    if (adminPass !== "admin123") { // Temporary simple check, can be changed
        iosAlert("Unauthorized access.", "Error");
        return;
    }

    let currentConfig = localStorage.getItem(FIREBASE_CONFIG_KEY) || "";
    let msg = `
        <div class="text-left text-sm mb-4 text-gray-600">
            <p class="mb-2"><strong>Configure Master Cloud Sync</strong></p>
            <p class="mb-2">Enter the central Firebase configuration object (JSON format). All users' backups will sync to this database under their unique Device ID.</p>
        </div>
    `;
    let newConfig = await iosPrompt(msg, currentConfig, "Admin Cloud Sync");
    if (newConfig !== null) {
        if (newConfig.trim() === "") {
            localStorage.removeItem(FIREBASE_CONFIG_KEY);
            iosAlert("Cloud sync disabled.", "Cloud Sync");
        } else {
            try {
                let cleanConfig = newConfig.replace(/const\\s+.*=\\s*/, '').replace(/;/g, '');
                JSON.parse(cleanConfig);
                localStorage.setItem(FIREBASE_CONFIG_KEY, cleanConfig);
                iosAlert("Firebase config saved! Reload the app to initialize sync.", "Success");
            } catch(e) {
                iosAlert("Invalid JSON format.", "Error");
            }
        }
    }
}"""

# Actually, I shouldn't execute this patch without explaining the architecture first. 
