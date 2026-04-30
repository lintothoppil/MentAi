import sys

file_path = r"d:\mentAi\src\pages\StudentInsightsPage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove Trend Pill Row
pill_start = text.find('{/* Trend Pill Row */}')
if pill_start != -1:
    pill_end = text.find('</div>', pill_start) + 6 # end of the div
    # Wait, the div has a nested map. Let's match the closing div of "flex gap-4 items-center px-2"
    # Actually, it's safer to just regex it or find precise matching.
    pill_end = text.find('</div>\n                        </div>\n\n                    {/* ──── CHAT SIDEBAR')
    if pill_end != -1:
        # Actually in the file it looks like:
        #                          {/* Trend Pill Row */}
        # ...
        #                         </div>
        #                     </div>
        # 
        #                     {/* ──── CHAT SIDEBAR
        pass

# Let's use re to remove Trend Pill Row
import re
text = re.sub(r'\{/\* Trend Pill Row \*/\}.*?</div>\s*</div>\s*</div>\s*(?=\{/\* ──── CHAT SIDEBAR)', '</div></div>\n\n', text, flags=re.DOTALL)
# Actually, the div closes the lg:col-span-12. Let's be minimal.
text = re.sub(r'\s*\{/\* Trend Pill Row \*/\}.*?\]\.map\(t => \(.*?</div>.*?\)\)\}.*?</div>', '', text, flags=re.DOTALL)

# 2. Remove CHAT SIDEBAR
text = re.sub(r'\s*\{/\* ──── CHAT SIDEBAR \(RIGHT\) ─────────────────── \*/\}.*?</Card>\s*</div>', '', text, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("done")
