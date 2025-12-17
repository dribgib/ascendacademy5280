import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const env = (import.meta as any).env || {};

// Standard Supabase Variables
const supabaseUrl = env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Debug logging to help troubleshoot connection
if (!isSupabaseConfigured) {
  console.log('Ascend Academy Config Status: INCOMPLETE');
  console.log('Target URL:', supabaseUrl || 'MISSING (Check Vercel Vars)'); 
  console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'MISSING');
} else {
  console.log('Supabase Configured');
  console.log('URL:', supabaseUrl);
}

// Fallback to prevent crash during build, but app will not function without keys
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);