import re

with open('app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the button
button_pattern = r'\s*<button onclick="promptFirebaseConfig\(\)".*?>.*?Cloud Sync Setup\s*</button>'
content = re.sub(button_pattern, '', content, flags=re.DOTALL)

# Remove the promptFirebaseConfig function
func_pattern = r'async function promptFirebaseConfig\(\)\s*\{.*?\n\}\n'
content = re.sub(func_pattern, '', content, flags=re.DOTALL)

with open('app.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed button and prompt function.")
