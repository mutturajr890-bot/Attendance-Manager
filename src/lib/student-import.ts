import * as XLSX from "xlsx";

export type ImportedStudent = { name: string; register_number: string };

const nameKeys = ["name", "student name", "student", "full name", "studentname"];
const regKeys = [
  "register number",
  "register no",
  "reg no",
  "regno",
  "roll no",
  "roll number",
  "register_number",
  "usn",
  "id",
];

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) {
      const v = row[k];
      if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

/** Reads an Excel or CSV file and returns the students it contains. */
export async function parseStudentFile(file: File): Promise<ImportedStudent[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const out: ImportedStudent[] = [];
  for (const row of rows) {
    let name = pick(row, nameKeys);
    let reg = pick(row, regKeys);
    if (!name && !reg) {
      const values = Object.values(row).map((v) => String(v ?? "").trim());
      const filled = values.filter(Boolean);
      if (filled.length >= 2) {
        reg = filled[0] ?? "";
        name = filled[1] ?? "";
      } else if (filled.length === 1) {
        name = filled[0] ?? "";
      }
    }
    if (!name && !reg) continue;
    out.push({ name: name || reg, register_number: reg || name });
  }
  return out;
}
