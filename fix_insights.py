import sys
import re

file_path = r"d:\mentAi\src\pages\StudentInsightsPage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Expand the column
text = text.replace('lg:col-span-8', 'lg:col-span-12')

# 2. Remove the Declining pill
pill_str1 = '                                { l: "Declining", c: "bg-red-500",     e: "📉" },\n'
pill_str2 = '                                { l: "Declining", c: "bg-red-500",     e: "📉" },\r\n'
text = text.replace(pill_str1, '')
text = text.replace(pill_str2, '')

# 3. Remove the chat sidebar UI
start_marker = '{/* ──── CHAT SIDEBAR (RIGHT) ─────────────────── */}'
# It ends right before `</div>\n            </div>\n        </DashboardLayout>`
# Let's find the start
start_idx = text.find(start_marker)
if start_idx != -1:
    # Find the end of the DashboardLayout
    end_marker = '</div>\n            </div>\n        </DashboardLayout>'
    end_idx = text.rfind(end_marker)
    if end_idx == -1:
        end_marker = '</div>\r\n            </div>\r\n        </DashboardLayout>'
        end_idx = text.rfind(end_marker)
        
    if end_idx != -1:
        # Also include the preceding indent of the start_marker if any to keep clean
        replace_start = text.rfind('<div className="lg:col-span-4 lg:sticky lg:top-6">', 0, start_idx + 100)
        if replace_start != -1:
            # We want to remove from start_marker down to the end_marker
            # Actually, the start_marker is preceded by `{/* ──── CHAT SIDEBAR`
            # Let's just slice it from start_marker to end_idx
            sidebar_content = text[start_idx:end_idx]
            text = text.replace(sidebar_content, '')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Updated successfully")
