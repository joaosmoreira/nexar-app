import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vprgqwmkeaahmypeeanq.supabase.co";
const SUPABASE_ANON = "sb_publishable_yAI91vH5yd0-npUVyxSJfQ_7NtkTfNX";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function randomizeDates() {
  console.log("A extrair todas as O.F. ativas para diversificar a pauta etária...");
  
  const { data: ofs } = await supabase.from('ordens_fabrico').select('id');
  if (!ofs) return;

  console.log(`Encontradas ${ofs.length} OFs. A dispersar cronologicamente num raio de 30 dias...`);

  // Agrupar execuções para o servidor não bloquear
  const chunkSize = 50;
  for (let i = 0; i < ofs.length; i += chunkSize) {
    const chunk = ofs.slice(i, i + chunkSize);
    
    const promises = chunk.map(ofData => {
       const randomDays = Math.floor(Math.random() * 35); // Dá 0 a 35 dias velhas
       const pastDate = new Date();
       pastDate.setDate(pastDate.getDate() - randomDays);
       return supabase.from('ordens_fabrico').update({ criado_em: pastDate.toISOString() }).eq('id', ofData.id);
    });
    
    await Promise.all(promises);
  }
  
  console.log("Geração efetuada com sucesso! Clique em qualquer projeto para ver a tabela reordenada magicamente a nível de velhice das tarefas.");
}

randomizeDates();
