import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

// Public anon key re-export for calling Edge Functions directly
export const supabaseAnonKey = publicAnonKey;

// Edge function name in Supabase is "server"
export const serverUrl = `${supabaseUrl}/functions/v1/server`;
