import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

// Public anon key re-export for calling Edge Functions directly
export const supabaseAnonKey = publicAnonKey;

// Edge function URL: override with VITE_SERVER_URL for local Supabase (e.g. http://localhost:54321/functions/v1/server)
export const serverUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) || `${supabaseUrl}/functions/v1/server`;
