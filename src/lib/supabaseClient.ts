import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser Supabase client with cookie-based session persistence (more reliable on mobile). */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
