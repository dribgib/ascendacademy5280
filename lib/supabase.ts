import { createClient } from '@supabase/supabase-js';

// Direct access ensures Vite replaces these at build time
// We use || {} to prevent crashes if import.meta.env is undefined in specific environments
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined';

if (!isSupabaseConfigured) {
  console.warn('Ascend Academy: Supabase Environment Variables Missing. Check VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY.');
} else {
  console.log('Ascend Academy: Supabase Configured.');
}

// Fallback to avoid crashes, but API service will fail gracefully if keys are invalid
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);