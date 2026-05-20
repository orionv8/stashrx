import re

with open('app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the FIREBASE_CONFIG_KEY constant if it's still there
content = re.sub(r'const FIREBASE_CONFIG_KEY = "stashRx_firebase_config";\n', '', content)

# Replacement block for the background sync loop initialization
old_init_block = r"""// Background sync loop
\(async function\(\) \{
    const configStr = localStorage\.getItem\(FIREBASE_CONFIG_KEY\);
    if \(!configStr\) return; // Sync not enabled
    
    try \{
        const config = JSON\.parse\(configStr\);
        if \(typeof firebase === 'undefined'\) \{"""

new_init_block = """// Background sync loop
(async function() {
    const config = {
      apiKey: "AIzaSyBt8mCJ_Q3-Vr8i0kUFVwkL5IddQDl0ODE",
      authDomain: "stashrx-63954.firebaseapp.com",
      projectId: "stashrx-63954",
      storageBucket: "stashrx-63954.firebasestorage.app",
      messagingSenderId: "330835001360",
      appId: "1:330835001360:web:be493719fc730a051a4a95",
      measurementId: "G-8YYFY09YT9"
    };
    
    try {
        if (typeof firebase === 'undefined') {"""

content = re.sub(old_init_block, new_init_block, content)

with open('app.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied Firebase hardcode config.")
