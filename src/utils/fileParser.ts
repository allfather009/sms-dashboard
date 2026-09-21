import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Contact } from '@/types';

export interface ParseResult {
  contacts: Contact[];
  totalParsed: number;
  errors: string[];
  columnsFound: string[];
}

/**
 * Normalizes column keys to standard field names
 */
function normalizeHeader(header: string): 'name' | 'phoneNumber' | 'department' | 'stage' | null {
  const clean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (clean.includes('name') || clean === 'person' || clean === 'contact' || clean === 'fullname') {
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
    clean.includes('team') ||
    clean.includes('division')
  ) {
    return 'department';
  }
  if (
    clean.includes('stage') ||
    clean.includes('status') ||
    clean.includes('phase') ||
    clean.includes('step') ||
    clean.includes('funnel')
  ) {
    return 'stage';
  }
  return null;
}

/**
 * Parses raw row objects into normalized Contact items
 */
function processRows(rows: Record<string, unknown>[]): { contacts: Contact[]; errors: string[]; columnsFound: string[] } {
  const contacts: Contact[] = [];
  const errors: string[] = [];
  if (rows.length === 0) {
    return { contacts, errors: ['File contains no rows or records.'], columnsFound: [] };
  }

  // Detect header mappings
  const rawHeaders = Object.keys(rows[0] || {});
  const mapping: Record<string, 'name' | 'phoneNumber' | 'department' | 'stage'> = {};

  rawHeaders.forEach((h) => {
    const normalized = normalizeHeader(h);
    if (normalized) {
      mapping[h] = normalized;
    }
  });

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for header line + 1-indexed
    let name = '';
    let phoneNumber = '';
    let department = 'General';
    let stage = 'Stage 1';

    Object.entries(row).forEach(([key, val]) => {
      const field = mapping[key];
      const strVal = String(val ?? '').trim();
      if (!strVal) return;

      if (field === 'name') name = strVal;
      else if (field === 'phoneNumber') phoneNumber = strVal;
      else if (field === 'department') department = strVal;
      else if (field === 'stage') stage = strVal;
    });

    if (!name && !phoneNumber) {
      // Empty row, skip silently
      return;
    }

    if (!phoneNumber) {
      errors.push(`Row ${rowNum}: Skipped contact "${name || 'Unnamed'}" because phone number was missing.`);
      return;
    }

    // Format phone number cleanly
    const cleanPhone = phoneNumber.replace(/[^\d+()\- ]/g, '').trim();

    contacts.push({
      id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name || `Contact ${index + 1}`,
      phoneNumber: cleanPhone,
      department: department || 'General',
      stage: stage.startsWith('Stage') ? stage : `Stage ${stage}`,
      createdAt: new Date().toISOString(),
    });
  });

  return { contacts, errors, columnsFound: rawHeaders };
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
          const { contacts, errors, columnsFound } = processRows(results.data as Record<string, unknown>[]);
          resolve({
            contacts,
            totalParsed: contacts.length,
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
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('The uploaded Excel spreadsheet does not contain any worksheets.');
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const { contacts, errors, columnsFound } = processRows(rows);

      return {
        contacts,
        totalParsed: contacts.length,
        errors,
        columnsFound,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse Excel file: ${message}`);
    }
  }

  throw new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
}

/**
 * Built-in high-quality sample contacts dataset for instant preview/testing
 */
export function getSampleContacts(): Contact[] {
  return [
    {
      id: 'cnt-sample-1',
      name: 'Eleanor Vance',
      phoneNumber: '+1 (415) 555-0192',
      department: 'Sales',
      stage: 'Stage 1',
      createdAt: '2026-09-18T10:00:00Z',
    },
    {
      id: 'cnt-sample-2',
      name: 'Marcus Sterling',
      phoneNumber: '+1 (312) 555-0144',
      department: 'Engineering',
      stage: 'Stage 2',
      createdAt: '2026-09-18T11:30:00Z',
    },
    {
      id: 'cnt-sample-3',
      name: 'Sophia Chen',
      phoneNumber: '+1 (206) 555-0187',
      department: 'Sales',
      stage: 'Stage 1',
      createdAt: '2026-09-19T09:15:00Z',
    },
    {
      id: 'cnt-sample-4',
      name: 'Liam O’Connor',
      phoneNumber: '+44 7700 900142',
      department: 'Human Resources',
      stage: 'Stage 3',
      createdAt: '2026-09-19T14:20:00Z',
    },
    {
      id: 'cnt-sample-5',
      name: 'Amara Okafor',
      phoneNumber: '+1 (512) 555-0178',
      department: 'Product',
      stage: 'Stage 2',
      createdAt: '2026-09-20T08:45:00Z',
    },
    {
      id: 'cnt-sample-6',
      name: 'Julian Hayes',
      phoneNumber: '+1 (617) 555-0163',
      department: 'Sales',
      stage: 'Stage 2',
      createdAt: '2026-09-20T12:00:00Z',
    },
    {
      id: 'cnt-sample-7',
      name: 'Clara Dupont',
      phoneNumber: '+33 6 12 34 56 78',
      department: 'Marketing',
      stage: 'Stage 1',
      createdAt: '2026-09-20T15:30:00Z',
    },
    {
      id: 'cnt-sample-8',
      name: 'Tariq Al-Mansoor',
      phoneNumber: '+971 50 123 4567',
      department: 'Human Resources',
      stage: 'Stage 1',
      createdAt: '2026-09-21T07:10:00Z',
    },
    {
      id: 'cnt-sample-9',
      name: 'Zoe Katsaros',
      phoneNumber: '+1 (408) 555-0129',
      department: 'Engineering',
      stage: 'Stage 3',
      createdAt: '2026-09-21T08:00:00Z',
    },
    {
      id: 'cnt-sample-10',
      name: 'Devon Miller',
      phoneNumber: '+1 (303) 555-0199',
      department: 'Marketing',
      stage: 'Stage 2',
      createdAt: '2026-09-21T09:20:00Z',
    },
    {
      id: 'cnt-sample-11',
      name: 'Maya Patel',
      phoneNumber: '+1 (917) 555-0112',
      department: 'Sales',
      stage: 'Stage 1',
      createdAt: '2026-09-21T09:45:00Z',
    },
    {
      id: 'cnt-sample-12',
      name: 'Lucas Silva',
      phoneNumber: '+55 11 98765-4321',
      department: 'Product',
      stage: 'Stage 3',
      createdAt: '2026-09-21T10:15:00Z',
    },
  ];
}

/**
 * Downloads a pre-formatted sample CSV file to user's computer
 */
export function downloadSampleCSV(): void {
  const sampleData = [
    { Name: 'Eleanor Vance', 'Phone Number': '+1 (415) 555-0192', Department: 'Sales', Stage: 'Stage 1' },
    { Name: 'Marcus Sterling', 'Phone Number': '+1 (312) 555-0144', Department: 'Engineering', Stage: 'Stage 2' },
    { Name: 'Sophia Chen', 'Phone Number': '+1 (206) 555-0187', Department: 'Sales', Stage: 'Stage 1' },
    { Name: 'Liam O’Connor', 'Phone Number': '+44 7700 900142', Department: 'Human Resources', Stage: 'Stage 3' },
    { Name: 'Amara Okafor', 'Phone Number': '+1 (512) 555-0178', Department: 'Product', Stage: 'Stage 2' },
    { Name: 'Julian Hayes', 'Phone Number': '+1 (617) 555-0163', Department: 'Sales', Stage: 'Stage 2' },
    { Name: 'Clara Dupont', 'Phone Number': '+33 6 12 34 56 78', Department: 'Marketing', Stage: 'Stage 1' },
    { Name: 'Tariq Al-Mansoor', 'Phone Number': '+971 50 123 4567', Department: 'Human Resources', Stage: 'Stage 1' },
  ];

  const csvContent = Papa.unparse(sampleData);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sms_contacts_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports an array of Contact items to a downloadable CSV file
 */
export function exportContactsToCSV(contacts: Contact[], filename = 'contacts_export.csv'): void {
  if (!contacts || contacts.length === 0) return;
  const exportData = contacts.map((c) => ({
    Name: c.name,
    'Phone Number': c.phoneNumber,
    Department: c.department,
    Stage: c.stage,
    Created: c.createdAt,
  }));
  const csvContent = Papa.unparse(exportData);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
