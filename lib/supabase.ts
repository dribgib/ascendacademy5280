import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const env = (import.meta as any).env || {};

// 1. Try Environment Variables (Vercel/Local .env)
let supabaseUrl = env.VITE_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// 2. Fallback: Try Local Storage (For easier preview/demo setup without creating .env files)
if (!supabaseUrl && typeof window !== 'undefined') {
  supabaseUrl = localStorage.getItem('VITE_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey && typeof window !== 'undefined') {
  supabaseAnonKey = localStorage.getItem('VITE_PUBLIC_SUPABASE_ANON_KEY');
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Debug logging to help troubleshoot connection
if (!isSupabaseConfigured) {
  console.log('Ascend Academy Config Status: INCOMPLETE');
  console.log('Target URL:', supabaseUrl || 'MISSING (Check Vercel Vars)'); 
  console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'MISSING');
} else {
  console.log('Supabase Configured');
  // console.log('URL:', supabaseUrl); // Uncomment for debugging
}

// Fallback to prevent crash during build, but app will not function without keys
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);