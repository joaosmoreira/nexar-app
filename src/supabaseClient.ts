import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vprgqwmkeaahmypeeanq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yAI91vH5yd0-npUVyxSJfQ_7NtkTfNX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
