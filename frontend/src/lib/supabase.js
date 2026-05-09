import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Config Check]', { 
  url: supabaseUrl ? 'Found' : 'Missing', 
  key: supabaseAnonKey ? 'Found' : 'Missing' 
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your .env.local file.');
}

export const supabase = createClient(
  supabaseUrl || 'http://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
