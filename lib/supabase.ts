import { createClient } from '@supabase/supabase-js';

// Access environment variables directly to ensure Vite performs static replacement during build
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

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