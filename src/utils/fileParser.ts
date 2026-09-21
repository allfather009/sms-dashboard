import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Contact, Student } from '@/types';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';

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
  const clean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (
    clean === 'studentid' ||
    clean === 'student_id' ||
    clean === 'id' ||
    clean === 'universityid' ||
    clean === 'rollno' ||
    clean === 'regno'
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
function processRows(rows: Record<string, unknown>[]): {
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

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    let studentId = '';
    let name = '';
    let phoneNumber = '';
    let department = 'Information Technology';
    let stage = 'Stage 1';

    Object.entries(row).forEach(([key, val]) => {
      const field = mapping[key];
      const strVal = String(val ?? '').trim();
      if (!strVal) return;

      if (field === 'studentId') studentId = strVal;
      else if (field === 'name') name = strVal;
      else if (field === 'phoneNumber') phoneNumber = strVal;
      else if (field === 'department') department = strVal;
      else if (field === 'stage') stage = strVal;
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
    const effectiveStage = stage.toLowerCase().startsWith('stage') ? stage : `Stage ${stage}`;

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
 * Parses a File object (CSV, XLSX, XLS) in the browser
 */
export async function parseContactFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const { contacts, students, errors, columnsFound } = processRows(results.data as Record<string, unknown>[]);
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

          const { contacts, students, errors, columnsFound } = processRows(rawRows);

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
      Department: 'Information Technology',
      'Academic Stage': 'Stage 2',
      'Phone Number': '07501234567',
    },
    {
      'Student ID': 'U2024-1002',
      'Full Name': 'Fatima Zahra Hassan',
      Department: 'Information Technology',
      'Academic Stage': 'Stage 2',
      'Phone Number': '07702345678',
    },
    {
      'Student ID': 'U2024-1003',
      'Full Name': 'Mustafa Mohammed Kareem',
      Department: 'Computer Science',
      'Academic Stage': 'Stage 1',
      'Phone Number': '07803456789',
    },
    {
      'Student ID': 'U2024-1004',
      'Full Name': 'Zainab Hussein Al-Musawi',
      Department: 'Software Engineering',
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
      Department: 'Business Administration',
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
