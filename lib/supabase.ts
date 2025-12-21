import { createClient } from '@supabase/supabase-js';

// Safely access environment variables with a fallback
// @ts-ignore
const env = import.meta.env || {};

// @ts-ignore
const supabaseUrl = env.VITE_PUBLIC_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.warn('Ascend Academy: Supabase Environment Variables Missing. Check VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY.');
} else {
  console.log('Ascend Academy: Supabase Configured.');
}

// Fallback to placeholder to avoid crash on load, but API calls will fail if keys are invalid
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);