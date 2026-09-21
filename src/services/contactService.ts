import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Contact } from '@/types';

export interface DatabaseContactRow {
  id: string;
  name: string;
  phone_number: string;
  department: string;
  stage: string;
  created_at: string;
}

/**
 * Maps a Supabase row to the application's Contact interface
 */
export function mapRowToContact(row: DatabaseContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phone_number,
    department: row.department,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all contacts directly from Supabase contacts table
 */
export async function fetchContactsFromSupabase(): Promise<{
  data: Contact[];
  error: string | null;
  isConfigured: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      error: 'Supabase URL is not configured yet in .env.local',
      isConfigured: false,
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: error.message,
        isConfigured: true,
      };
    }

    const contacts: Contact[] = (data || []).map(mapRowToContact);
    return {
      data: contacts,
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
 * Batch inserts parsed contacts into the Supabase contacts table
 */
export async function batchInsertContactsToSupabase(
  newContacts: Array<{
    name: string;
    phoneNumber: string;
    department: string;
    stage: string;
  }>
): Promise<{
  insertedContacts: Contact[];
  count: number;
  error: string | null;
  isConfigured: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      insertedContacts: [],
      count: 0,
      error: 'Supabase URL is not configured in .env.local. Falling back to local state.',
      isConfigured: false,
    };
  }

  try {
    const supabase = createClient();

    // Map to exact Supabase database column names
    const rowsToInsert = newContacts.map((c) => ({
      name: c.name,
      phone_number: c.phoneNumber,
      department: c.department,
      stage: c.stage,
    }));

    const { data, error } = await supabase
      .from('contacts')
      .insert(rowsToInsert)
      .select();

    if (error) {
      return {
        insertedContacts: [],
        count: 0,
        error: error.message,
        isConfigured: true,
      };
    }

    const inserted: Contact[] = (data || []).map(mapRowToContact);
    return {
      insertedContacts: inserted,
      count: inserted.length,
      error: null,
      isConfigured: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      insertedContacts: [],
      count: 0,
      error: msg,
      isConfigured: true,
    };
  }
}

/**
 * Deletes a contact from the Supabase contacts table by ID
 */
export async function deleteContactFromSupabase(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { success: true, error: null };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('contacts').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
