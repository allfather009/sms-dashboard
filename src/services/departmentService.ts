/**
 * ==============================================================================
 * DEPARTMENT SERVICE
 * ==============================================================================
 * Fetches and manages TIU Sulaimani academic departments from Supabase
 * with in-memory caching to avoid redundant round-trips.
 * ==============================================================================
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Department } from '@/types';

// Default TIU Sulaimani departments preset (used as instant fallback)
export const DEFAULT_TIU_DEPARTMENTS: string[] = [
  'Accounting',
  'Architectural Engineering',
  'Business and Management',
  'Civil Engineering',
  'Computer Engineering',
  'Dentistry',
  'English Language Teaching',
  'Finance and Banking',
  'Information Technology (IT)',
  'Interior Design Engineering',
  'International Relations and Diplomacy',
  'MLS',
  'Nursing',
  'Pharmacy',
  'Physiotherapy',
];

interface CacheEntry {
  data: string[];
  timestamp: number;
}

let departmentCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches the active list of department names from the Supabase departments table.
 * Results are cached in memory for 5 minutes.
 */
export async function fetchDepartmentsFromSupabase(forceRefresh = false): Promise<{
  data: string[];
  error?: string;
  source: 'cache' | 'supabase' | 'fallback';
}> {
  const now = Date.now();

  // Return cached result if valid and refresh not forced
  if (!forceRefresh && departmentCache && now - departmentCache.timestamp < CACHE_TTL_MS) {
    return { data: departmentCache.data, source: 'cache' };
  }

  if (!isSupabaseConfigured()) {
    return { data: DEFAULT_TIU_DEPARTMENTS, source: 'fallback' };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase departments fetch warning:', error.message);
      // Fallback to cache or defaults
      const fallback = departmentCache?.data || DEFAULT_TIU_DEPARTMENTS;
      return { data: fallback, error: error.message, source: 'fallback' };
    }

    if (data && data.length > 0) {
      const names = data.map((d: Department) => d.name);
      departmentCache = {
        data: names,
        timestamp: now,
      };
      return { data: names, source: 'supabase' };
    }

    return { data: DEFAULT_TIU_DEPARTMENTS, source: 'fallback' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    console.error('Error fetching departments:', message);
    return { data: departmentCache?.data || DEFAULT_TIU_DEPARTMENTS, error: message, source: 'fallback' };
  }
}
