import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Contact, Student } from '@/types';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';

export const VALID_STAGES = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'] as const;
export type ValidStage = (typeof VALID_STAGES)[number];

/**
 * Strictly normalizes and sanitizes any input into one of the valid stages:
 * 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5'
 */
export function normalizeStage(input: unknown, defaultStage: ValidStage = 'Stage 1'): ValidStage {
  if (!input) return defaultStage;
  let s = String(input).trim();

  // If uploaded stage value is just a raw digit (e.g., 1, 2, 3), automatically prepend "Stage "
  if (/^[1-5]$/.test(s)) {
    return `Stage ${s}` as ValidStage;
  }

  // Fix typos like 'satge', 'Stage Satge', etc.
  s = s.replace(/satge/gi, 'Stage');
  // Match any digits 1-5 anywhere in the string
  const numMatch = s.match(/[1-5]/);
  if (numMatch) {
    const stageStr = `Stage ${numMatch[0]}`;
    if (VALID_STAGES.includes(stageStr as ValidStage)) {
      return stageStr as ValidStage;
    }
  }
  // Check Roman numerals I - V
  if (/\b(V|5)\b/i.test(s)) return 'Stage 5';
  if (/\b(IV|4)\b/i.test(s)) return 'Stage 4';
  if (/\b(III|3)\b/i.test(s)) return 'Stage 3';
  if (/\b(II|2)\b/i.test(s)) return 'Stage 2';
  if (/\b(I|1)\b/i.test(s)) return 'Stage 1';

  return defaultStage;
}

export interface ParseResult {
  contacts: Contact[];
  students: Student[];
  totalParsed: number;
  errors: string[];
  columnsFound: string[];
}

/**
 * Normalizes column keys to standard field names
 */
function normalizeHeader(header: string): 'studentId' | 'name' | 'phoneNumber' | 'department' | 'stage' | null {
  const raw = header.trim().toLowerCase();
  const clean = raw.replace(/[^a-z0-9]/g, '');

  if (
    clean === 'studentid' ||
    clean === 'student_id' ||
    clean === 'id' ||
    clean === 'universityid' ||
    clean === 'rollno' ||
    clean === 'regno' ||
    clean === 'no' ||
    raw === 'no' ||
    raw === 'no.' ||
    raw === 'n.'
  ) {
    return 'studentId';
  }

  if (
    clean.includes('name') ||
    clean === 'person' ||
    clean === 'student' ||
    clean === 'fullname' ||
    clean === 'studentname'
  ) {
    return 'name';
  }

  if (
    clean.includes('phone') ||
    clean.includes('mobile') ||
    clean.includes('cell') ||
    clean.includes('tel') ||
    clean.includes('number')
  ) {
    return 'phoneNumber';
  }

  if (
    clean.includes('dept') ||
    clean.includes('department') ||
    clean.includes('college') ||
    clean.includes('faculty') ||
    clean.includes('division')
  ) {
    return 'department';
  }

  if (
    clean.includes('stage') ||
    clean.includes('satge') ||
    clean.includes('year') ||
    clean.includes('grade') ||
    clean.includes('level') ||
    clean.includes('academicstage')
  ) {
    return 'stage';
  }

  return null;
}

/**
 * Parses raw row objects into normalized Student and Contact items
 */
function processRows(
  rows: Record<string, unknown>[],
  options?: { defaultStage?: ValidStage; overrideStage?: ValidStage }
): {
  contacts: Contact[];
  students: Student[];
  errors: string[];
  columnsFound: string[];
} {
  const contacts: Contact[] = [];
  const students: Student[] = [];
  const errors: string[] = [];

  if (rows.length === 0) {
    return { contacts, students, errors: ['File contains no rows or records.'], columnsFound: [] };
  }

  const rawHeaders = Object.keys(rows[0] || {});
  const mapping: Record<string, 'studentId' | 'name' | 'phoneNumber' | 'department' | 'stage'> = {};

  rawHeaders.forEach((h) => {
    const normalized = normalizeHeader(h);
    if (normalized) {
      mapping[h] = normalized;
    }
  });

  const fallbackStage: ValidStage = options?.defaultStage || 'Stage 1';
  const overrideStage: ValidStage | undefined = options?.overrideStage;

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    let studentId = '';
    let name = '';
    let phoneNumber = '';
    let department = 'Information Technology (IT)';
    let stage: string = fallbackStage;

    Object.entries(row).forEach(([key, val]) => {
      const field = mapping[key];
      const strVal = String(val ?? '').trim();
      if (!strVal) return;

      if (field === 'studentId') studentId = strVal;
      else if (field === 'name') name = strVal;
      else if (field === 'phoneNumber') phoneNumber = strVal;
      else if (field === 'department') department = strVal;
      else if (field === 'stage') stage = normalizeStage(strVal, fallbackStage);
    });

    if (!name && !phoneNumber) {
      return; // Skip empty row
    }

    if (!phoneNumber) {
      errors.push(`Row ${rowNum}: Skipped student "${name || 'Unnamed'}" because phone number was missing.`);
      return;
    }

    const phoneNorm = normalizeIraqPhoneNumber(phoneNumber);
    const cleanedPhone = phoneNorm.isValid ? phoneNorm.normalized : phoneNumber.replace(/[^\d+]/g, '');

    const generatedId = `STU-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveStudentId = studentId || `U2024-${1000 + index}`;
    const effectiveStage = overrideStage || normalizeStage(stage, fallbackStage);

    const studentItem: Student = {
      id: generatedId,
      studentId: effectiveStudentId,
      fullName: name || `Student ${index + 1}`,
      department,
      stage: effectiveStage,
      phoneNumber: cleanedPhone,
      createdAt: new Date().toISOString(),
    };

    students.push(studentItem);
    contacts.push({
      id: generatedId,
      name: studentItem.fullName,
      studentId: studentItem.studentId,
      phoneNumber: cleanedPhone,
      department,
      stage: effectiveStage,
      createdAt: studentItem.createdAt,
    });
  });

  return { contacts, students, errors, columnsFound: rawHeaders };
}

/**
 * Parses a File object (CSV, XLSX, XLS) in the browser with strict stage normalization
 */
export async function parseContactFile(
  file: File,
  options?: { defaultStage?: ValidStage; overrideStage?: ValidStage }
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const { contacts, students, errors, columnsFound } = processRows(
            results.data as Record<string, unknown>[],
            options
          );
          resolve({
            contacts,
            students,
            totalParsed: students.length,
            errors: [...errors, ...results.errors.map((e) => `CSV Error on line ${e.row}: ${e.message}`)],
            columnsFound,
          });
        },
        error: (err) => {
          reject(new Error(`Failed to parse CSV file: ${err.message}`));
        },
      });
    });
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];

          if (!firstSheetName) {
            throw new Error('The uploaded Excel workbook contains no sheets.');
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            blankrows: false,
          });

          const { contacts, students, errors, columnsFound } = processRows(rawRows, options);

          resolve({
            contacts,
            students,
            totalParsed: students.length,
            errors,
            columnsFound,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error parsing Excel workbook';
          reject(new Error(message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file from filesystem.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error(`Unsupported file type: ${file.name}. Please upload a .csv, .xlsx, or .xls file.`);
}

/**
 * Downloads a pre-formatted sample CSV file for student bulk import
 */
export function downloadSampleCSV(): void {
  const sampleData = [
    {
      'Student ID': 'U2024-1001',
      'Full Name': 'Ahmed Ali Al-Bayati',
      Department: 'Information Technology (IT)',
      'Academic Stage': 'Stage 2',
      'Phone Number': '07501234567',
    },
    {
      'Student ID': 'U2024-1002',
      'Full Name': 'Fatima Zahra Hassan',
      Department: 'Information Technology (IT)',
      'Academic Stage': 'Stage 2',
      'Phone Number': '07702345678',
    },
    {
      'Student ID': 'U2024-1003',
      'Full Name': 'Mustafa Mohammed Kareem',
      Department: 'Computer Engineering',
      'Academic Stage': 'Stage 1',
      'Phone Number': '07803456789',
    },
    {
      'Student ID': 'U2024-1004',
      'Full Name': 'Zainab Hussein Al-Musawi',
      Department: 'Computer Engineering',
      'Academic Stage': 'Stage 3',
      'Phone Number': '07504567890',
    },
    {
      'Student ID': 'U2024-1005',
      'Full Name': 'Omar Farooq Al-Janabi',
      Department: 'Civil Engineering',
      'Academic Stage': 'Stage 4',
      'Phone Number': '07705678901',
    },
    {
      'Student ID': 'U2024-1006',
      'Full Name': 'Sara Bilal Al-Obaidi',
      Department: 'Business and Management',
      'Academic Stage': 'Stage 1',
      'Phone Number': '07806789012',
    },
    {
      'Student ID': 'U2024-1007',
      'Full Name': 'Ahmed Tariq Al-Bayati',
      Department: 'Pharmacy',
      'Academic Stage': 'Stage 5',
      'Phone Number': '07501234567',
    },
  ];

  const csvContent = Papa.unparse(sampleData);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'student_import_template_iraq.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Returns empty sample contacts array (used for initialization)
 */
export function getSampleContacts(): Contact[] {
  return [];
}
