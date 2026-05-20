import re

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "r") as f:
    content = f.read()

# We can append our new logic inside the <script> block at the very end
script_addition = """
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script>
console.log("Global DB instance: ", typeof db !== 'undefined' ? db : 'not found');
</script>
"""

content = content.replace("</body>", script_addition + "\n</body>")

with open("/home/orionv888/.hermes/mockups/stashrx/app.html", "w") as f:
    f.write(content)

print("Added debug script.")
