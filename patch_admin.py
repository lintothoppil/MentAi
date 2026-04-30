import re

with open("src/pages/AdminStudentsPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add lucide-react import
content = content.replace("Plus } from", "Plus, Upload } from")

# 2. Add state for bulk upload
state_block = """    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleBulkUpload = async () => {
        if (!uploadFile) {
            toast.error("Please select a CSV file first");
            return;
        }
        setUploading(true);
        const fd = new FormData();
        fd.append('file', uploadFile);
        
        try {
            const res = await fetch("http://localhost:5000/api/admin/students/bulk-upload", {
                method: "POST",
                body: fd
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Successfully uploaded ${data.data.success} students.`);
                setUploadResult(data.data);
                fetchStudents();
            } else {
                toast.error(data.message || "Failed to upload");
                if (data.data) setUploadResult(data.data);
            }
        } catch(e) {
            toast.error("Network upload error.");
        }
        setUploading(false);
    };"""

import_react = """import { useState, useEffect } from "react";"""
if "import React" not in content and "const fileInputRef = React.useRef" in state_block:
    content = content.replace(import_react, """import React, { useState, useEffect } from "react";""")

content = content.replace("    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);", state_block)

# 3. Add UI button inside the view where we usually manage batches
button_ui = """                <div>
                        <h2 className="text-3xl font-bold tracking-tight">Students Directory</h2>
                        <p className="text-muted-foreground">All students by department. Filter by batch to manage.</p>
                    </div>
                    <div>
                        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                        
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                                    <Upload className="h-4 w-4" /> Bulk Legacy Upload
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>Bulk Upload Student Records</DialogTitle>
                                    <DialogDescription>
                                        Upload a CSV file containing legacy batches. The system will auto-calculate their Semesters and mark them as Alumni if they have passed out.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="rounded-xl bg-orange-50/50 border border-orange-200 p-4 font-mono text-xs overflow-x-auto">
                                        <p className="font-bold mb-2">Required CSV Headers:</p>
                                        student_name, roll_number, program, branch, batch_start_year, email
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Select CSV File</Button>
                                        <span className="text-sm font-semibold">{uploadFile ? uploadFile.name : 'No file selected'}</span>
                                    </div>
                                    
                                    {uploadResult && (
                                        <div className="mt-4 border rounded-xl p-4 bg-slate-50">
                                            <p className="font-bold mb-2 text-primary">Upload Summary:</p>
                                            <p className="text-sm text-green-600 font-bold">Successfully imported: {uploadResult.success}</p>
                                            <p className="text-sm text-red-500 font-bold">Failed rows: {uploadResult.failed}</p>
                                            
                                            {uploadResult.errors && uploadResult.errors.length > 0 && (
                                                <div className="mt-3 text-xs bg-red-50 text-red-800 p-3 rounded-lg max-h-32 overflow-y-auto font-mono">
                                                    {uploadResult.errors.map((e: string, idx: number) => <p key={idx}>{e}</p>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleBulkUpload} disabled={!uploadFile || uploading}>
                                        {uploading ? 'Processing & Validating...' : 'Start Import'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>"""

# Ensure Dialog imports
if "Dialog," not in content:
    content = content.replace("DropdownMenuTrigger,\n} from \"@/components/ui/dropdown-menu\";", """DropdownMenuTrigger,\n} from "@/components/ui/dropdown-menu";\nimport { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";""")

content = content.replace("""                {!selectedDept && (
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Students Directory</h2>
                        <p className="text-muted-foreground">All students by department. Filter by batch to manage.</p>
                    </div>
                )}""", """                {!selectedDept && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
""" + button_ui + "\n                    </div>\n                )}")

with open("src/pages/AdminStudentsPage.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch admin applied")
