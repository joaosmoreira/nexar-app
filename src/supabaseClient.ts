import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As chaves secretas do Supabase falharam. Certifique-se que adicionou o ficheiro .env no sistema de diretorios original do Nexar.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
