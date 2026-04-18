import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vprgqwmkeaahmypeeanq.supabase.co";
const SUPABASE_ANON = "sb_publishable_yAI91vH5yd0-npUVyxSJfQ_7NtkTfNX";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function fudgedates() {
  console.log("A adulterar as datas de algumas O.F. abertas propositadamente para testar o Alerta Visual (Triângulo)...");
  
  // Apanha 5 ofs pendentes à toa
  const { data } = await supabase.from('ordens_fabrico').select('id').limit(5);
  if (!data) return;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 20); // Volta atrás 20 dias (passa o limiar das 2 semanas)

  const { error } = await supabase.from('ordens_fabrico')
    .update({ criado_em: pastDate.toISOString() })
    .in('id', data.map(d => d.id));
  
  if (error) console.error(error);
  else console.log("Pronto, datas alteradas com sucesso. A App vai detetá-las como velhas.");
}

fudgedates();
