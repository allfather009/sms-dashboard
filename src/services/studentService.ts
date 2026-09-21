import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Student, Contact } from '@/types';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';

export interface DatabaseStudentRow {
  id: string;
  student_id: string;
  full_name: string;
  department: string;
  stage: string;
  phone_number: string;
  created_at: string;
}

/**
 * Maps a Supabase row to the application's Student interface
 */
export function mapRowToStudent(row: DatabaseStudentRow): Student {
  return {
    id: row.id,
    studentId: row.student_id,
    fullName: row.full_name,
    department: row.department,
    stage: row.stage,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}

/**
 * Converts a Student object to Contact interface for backwards compatibility
 */
export function mapStudentToContact(s: Student): Contact {
  return {
    id: s.id,
    name: s.fullName,
    studentId: s.studentId,
    phoneNumber: s.phoneNumber,
    department: s.department,
    stage: s.stage,
    createdAt: s.createdAt,
  };
}

/**
 * Fetches all students directly from the Supabase students table
 */
export async function fetchStudentsFromSupabase(): Promise<{
  data: Student[];
  error: string | null;
  isConfigured: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      error: 'Supabase is not configured in .env.local',
      isConfigured: false,
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: error.message,
        isConfigured: true,
      };
    }

    const students: Student[] = (data || []).map(mapRowToStudent);
    return {
      data: students,
      error: null,
      isConfigured: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      data: [],
      error: msg,
      isConfigured: true,
    };
  }
}

/**
 * Inserts a single student into the Supabase students table
 */
export async function insertStudentToSupabase(student: {
  studentId: string;
  fullName: string;
  department: string;
  stage: string;
  phoneNumber: string;
}): Promise<{
  data: Student | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: 'Supabase is not configured in .env.local',
    };
  }

  try {
    const supabase = createClient();

    // Auto-normalize phone number to Bulk SMS Iraq format
    const phoneNorm = normalizeIraqPhoneNumber(student.phoneNumber);
    const cleanedPhone = phoneNorm.isValid ? phoneNorm.normalized : student.phoneNumber.trim();

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          student_id: student.studentId.trim(),
          full_name: student.fullName.trim(),
          department: student.department.trim(),
          stage: student.stage.trim(),
          phone_number: cleanedPhone,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: `A student with ID "${student.studentId}" already exists.` };
      }
      return { data: null, error: error.message };
    }

    return { data: mapRowToStudent(data), error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

/**
 * Updates an existing student record in Supabase
 */
export async function updateStudentInSupabase(
  id: string,
  updates: {
    studentId?: string;
    fullName?: string;
    department?: string;
    stage?: string;
    phoneNumber?: string;
  }
): Promise<{
  data: Student | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: 'Supabase is not configured in .env.local',
    };
  }

  try {
    const supabase = createClient();

    const dbPayload: Partial<DatabaseStudentRow> = {};
    if (updates.studentId !== undefined) dbPayload.student_id = updates.studentId.trim();
    if (updates.fullName !== undefined) dbPayload.full_name = updates.fullName.trim();
    if (updates.department !== undefined) dbPayload.department = updates.department.trim();
    if (updates.stage !== undefined) dbPayload.stage = updates.stage.trim();
    if (updates.phoneNumber !== undefined) {
      const phoneNorm = normalizeIraqPhoneNumber(updates.phoneNumber);
      dbPayload.phone_number = phoneNorm.isValid ? phoneNorm.normalized : updates.phoneNumber.trim();
    }

    const { data, error } = await supabase
      .from('students')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: `Student ID "${updates.studentId}" is already taken.` };
      }
      return { data: null, error: error.message };
    }

    return { data: mapRowToStudent(data), error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

/**
 * Deletes a student from the Supabase students table
 */
export async function deleteStudentFromSupabase(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { success: true, error: null };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('students').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Batch inserts students into the Supabase students table
 */
export async function batchInsertStudentsToSupabase(
  newStudents: Array<{
    studentId: string;
    fullName: string;
    department: string;
    stage: string;
    phoneNumber: string;
  }>
): Promise<{
  insertedStudents: Student[];
  count: number;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      insertedStudents: [],
      count: 0,
      error: 'Supabase is not configured in .env.local',
    };
  }

  try {
    const supabase = createClient();

    const rowsToInsert = newStudents.map((s) => {
      const phoneNorm = normalizeIraqPhoneNumber(s.phoneNumber);
      return {
        student_id: s.studentId,
        full_name: s.fullName,
        department: s.department,
        stage: s.stage,
        phone_number: phoneNorm.isValid ? phoneNorm.normalized : s.phoneNumber,
      };
    });

    const { data, error } = await supabase
      .from('students')
      .upsert(rowsToInsert, { onConflict: 'student_id' })
      .select();

    if (error) {
      return {
        insertedStudents: [],
        count: 0,
        error: error.message,
      };
    }

    const inserted: Student[] = (data || []).map(mapRowToStudent);
    return {
      insertedStudents: inserted,
      count: inserted.length,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      insertedStudents: [],
      count: 0,
      error: msg,
    };
  }
}
