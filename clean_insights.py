import re

file_path = r"d:\mentAi\src\pages\StudentInsightsPage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Remove the Timetable Grid
text = re.sub(r'\s*\{/\* Timetable Grid \*/\}.*?</Card>', '', text, flags=re.DOTALL)

# Remove the states that are no longer used
text = re.sub(r'const \[messages, setMessages\].+?;\n', '', text)
text = re.sub(r'const \[input, setInput\].+?;\n', '', text)
text = re.sub(r'const \[chatLoading, setChatLoading\].+?;\n', '', text)
text = re.sub(r'const \[plan, setPlan\].+?;\n', '', text)
text = re.sub(r'const \[planLoading, setPlanLoading\].+?;\n', '', text)
text = re.sub(r'const \[timetable, setTimetable\].+?;\n', '', text)
text = re.sub(r'const \[timetableLoading, setTimetableLoading\].+?;\n', '', text)
text = re.sub(r'const chatEnd.+?;\n', '', text)

# Remove fetchTimetable and useEffect
text = re.sub(r'\s*// fetch timetable.*?(?=\s*// scroll chat|\s*// welcome)', '', text, flags=re.DOTALL)

# Remove scroll chat, welcome, sendMsg, genPlan
text = re.sub(r'\s*// scroll chat.*?(?=    const srcInfo)', '', text, flags=re.DOTALL)

# Remove imports that might be unused (StudyScheduleGrid, ReactMarkdown)
text = re.sub(r'import ReactMarkdown from "react-markdown";\n', '', text)
text = re.sub(r'import \{ StudyScheduleGrid \} from "@/components/ui/StudyScheduleGrid";\n', '', text)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("done")
