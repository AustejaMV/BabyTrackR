import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://gmtqrtpqfmbkljagskfn.supabase.co';
const anonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtdHFydHBxZm1ia2xqYWdza2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzI1MDcsImV4cCI6MjA4ODQwODUwN30.YB_YVJUnnIdWUTSRllHv12zBXbMnbsU_vnQutnbg5s0';

export const supabase = createClient(supabaseUrl, anonKey);

export const supabaseAnonKey = anonKey;

export const serverUrl = env.VITE_SERVER_URL || `${supabaseUrl}/functions/v1/server`;
