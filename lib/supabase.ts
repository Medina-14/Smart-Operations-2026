import { createClient } from '@supabase/supabase-js';

// Extremely strict cleaning: Only allow letters, numbers, dots, dashes, underscores, slashes, and colons.
// This completely strips any hidden characters, emojis, or spaces that cause the "non ISO-8859-1 code point" fetch error.
const cleanUrl = (val?: string) => (val || '').replace(/[^a-zA-Z0-9-.:/]/g, '');
const cleanKey = (val?: string) => (val || '').replace(/[^a-zA-Z0-9-._]/g, '');

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
const supabaseAnonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
