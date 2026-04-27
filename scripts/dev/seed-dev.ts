import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CLIENTES = [
  'Mercadona Aveiro', 'Mercadona Porto', 'Mercadona Lisboa', 'Mercadona Braga',
  'Logicor Palmela', 'Logicor Azambuja', 'Continental Lousado', 'Coloplast Terrugem',
  'Gartek (GTK)', 'CTT Cabo Ruivo', 'DHL Alfena', 'DPD Maia', 'PostNL Madrid',
  'Sonae Maia', 'Jerónimo Martins Azambuja', 'Auto Europa', 'Simoldes Oliveira de Azeméis'
];

const TIPOS_OF = [
  'PT (Posto de Transformação)', 'Mezzanine Industrial (Piso Gradeado)', 'Escadas de Emergência',
  'Guardas de Proteção', 'Escadas de Bombeiro com Crinolina', 'Estrutura Principal de Pavilhão',
  'Portaria Principal', 'Guardas de Escada', 'Platibanda (Chapa Lacada)', 'Vedações Exteriores',
  'Reforços de Pilares HEB', 'Cobertura Deck', 'Painel de Fachada G9', 'Arremates de Platibanda',
  'Estrutura de Suporte AC', 'Marquise de Entrada'
];

const TAREFAS_BASE = [
  'Modelação 3D / Detalhe', 'Aprovisionamento de Aço', 'Corte e Furação CNC', 
  'Soldadura e Pré-Montagem', 'Metalização / Pintura', 'Carga e Transporte', 
  'Montagem em Obra', 'Remates e Ferragens', 'Limpeza / Auto de Receção'
];

async function seed() {
  console.log('🧹 Limpando dados anteriores...');
  const { data: userData } = await supabase.from('user_roles').select('user_id').eq('email', 'admin@admin.pt').single();
  if (!userData) return;
  const userId = userData.user_id;

  // Apagar projetos antigos que começam por GS20
  await supabase.from('projectos').delete().ilike('nome', 'GS20%');

  console.log('🚀 Iniciando Novo Seed Corrigido...');

  let currentOfNumber = 240001;

  for (let i = 0; i < 15; i++) {
    const cliente = CLIENTES[i % CLIENTES.length];
    const obraNome = `GS20${24 + i} - ${cliente}`; // FORMATO CORRETO: GS20xx - Cliente
    
    const isFullDone = i >= 12;
    const movementDate = new Date();
    if (isFullDone) movementDate.setDate(movementDate.getDate() - 10); // 10 dias atrás para gatilhar o auto-archive

    const { data: projeto, error: pErr } = await supabase.from('projectos').insert({
      user_id: userId,
      nome: obraNome,
      cliente: cliente,
      arquivado: false,
      ordem_index: i,
      ultimo_movimento: movementDate.toISOString()
    }).select().single();

    if (pErr) continue;
    console.log(`✅ Obra Criada: ${obraNome}`);

    const numOfs = isFullDone ? 6 : Math.floor(Math.random() * 10) + 3;

    for (let j = 0; j < numOfs; j++) {
      const isOfDone = isFullDone || (Math.random() > 0.8);
      const descOf = TIPOS_OF[Math.floor(Math.random() * TIPOS_OF.length)]; // DESCRIÇÃO TÉCNICA NA OF
      
      let prazo: Date | null = null;
      const r = Math.random();
      if (r < 0.2) { 
        prazo = new Date(); prazo.setDate(prazo.getDate() - 3); // Ultrapassado
      } else if (r < 0.5) {
        prazo = new Date(); prazo.setDate(prazo.getDate() + 3); // Apertado (3 dias)
      } else if (r < 0.8) {
        prazo = new Date(); prazo.setDate(prazo.getDate() + 20); // Alargado
      }

      const { data: ofData, error: ofErr } = await supabase.from('ordens_fabrico').insert({
        user_id: userId,
        projeto_id: projeto.id,
        nome_of: descOf,
        numero_of: (currentOfNumber++).toString(),
        status: isOfDone ? 'concluido' : 'em_progresso',
        prazo_limite: prazo?.toISOString() || null,
        ordem_index: j
      }).select().single();

      if (ofErr) continue;

      const tarefas = TAREFAS_BASE.map((nome, idx) => ({
        user_id: userId,
        ordem_id: ofData.id,
        nome_tarefa: nome,
        concluido: isOfDone ? true : (idx < Math.floor(Math.random() * 5)), 
        ordem_index: idx
      }));

      await supabase.from('tarefas').insert(tarefas);
    }
  }

  console.log('✨ Seed Finalizado com a estrutura correta!');
}

seed();
