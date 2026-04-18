import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vprgqwmkeaahmypeeanq.supabase.co";
const SUPABASE_ANON = "sb_publishable_yAI91vH5yd0-npUVyxSJfQ_7NtkTfNX";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const CLIENTS = [
  "Logicor Blackstone", 
  "Logicor Korber", 
  "Logicor Kaiser", 
  "Mercadona Esposende", 
  "Mercadona Portimão",
  "Metro do Porto",
  "Datacenter de Sines",
  "TSL Spain",
  "Airbus",
  "Amazon Logistics"
];

const OF_NAMES = [
  "Forn. e Mont. de Cobertura",
  "Forn. e Mont. de Fachada",
  "Guardas Interiores Administrativo",
  "Guardas Exteriores",
  "Escada de bombeiro",
  "Portões de posto de transformação",
  "Piso técnico posto de transformação",
  "Estrutura Pavilhão Industrial",
  "Mezanino Metálico",
  "Reforço Estrutural",
  "Pilares Metálicos",
  "Vigas Treliçadas",
  "Passadiços Metálicos",
  "Estrutura de Clarabóia"
];

const TAREFAS_BASE = [
  "Modelação",
  "Aprovisionamento Material",
  "Validação",
  "Fabrico",
  "Parafusaria",
  "Montagem"
];

async function generateData() {
  console.log("A limpar simulações interiores (GS24xx)...");
  
  // Clean old seed
  const { data: toDelete } = await supabase.from('projectos').select('id').like('nome', 'GS24%');
  if (toDelete && toDelete.length > 0) {
      await supabase.from('projectos').delete().in('id', toDelete.map(t => t.id));
      console.log("Foram apagados os projetos antigos antigos (GS24xx).");
  }

  console.log("\nA iniciar a geração de 10 novos projetos com 20 OFs cada (Novos Nomes - GS25xx)...");

  for (let i = 1; i <= 10; i++) {
    const projRef = `GS${2500 + i}`;
    const cliente = CLIENTS[i - 1]; // pick linearly
    const projNome = `${projRef} - ${cliente}`;

    console.log(`\nA criar Projeto ${i}/10: ${projNome}`);
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 15);

    // 1. Criar Projeto
    const { data: projData, error: projErr } = await supabase
      .from('projectos')
      .insert({ nome: projNome, cliente: cliente, arquivado: false, ultimo_movimento: pastDate.toISOString() })
      .select('id')
      .single();

    if (projErr) {
      console.error("Erro a criar projeto", projErr);
      continue;
    }

    const projetoId = projData.id;

    // 2. Criar cerca de 20 OFs (reduced from 30)
    const ofInsertBatch = [];
    for (let ofIdx = 1; ofIdx <= 20; ofIdx++) {
       const ofNum = `2026${String(Math.floor(Math.random() * 9000) + 1000)}`;
       const ofNome = OF_NAMES[Math.floor(Math.random() * OF_NAMES.length)];
       ofInsertBatch.push({
          projeto_id: projetoId,
          numero_of: ofNum,
          nome_of: ofNome,
          status: 'pendente'
       });
    }

    console.log(` - A inserir 20 OFs...`);
    const { data: ofsCreated, error: ofErr } = await supabase
      .from('ordens_fabrico')
      .insert(ofInsertBatch)
      .select('id');

    if (ofErr || !ofsCreated) {
      console.error("Erro a criar OFs", ofErr);
      continue;
    }

    // 3. Criar 6 tarefas para cada OF e definir 80% com concluido=true
    console.log(` - A injetar Tarefas (80% feitas, 20% abertas)...`);
    const tarefasInsertBatch = [];
    
    for (const ofRow of ofsCreated) {
       let isFullyFinished = Math.random() < 0.8; 
       if (i === 3) isFullyFinished = true; // O projeto 3 será 100% totalmente terminado para o auto-arquivo disparar!
       
       for (let tIdx = 0; tIdx < TAREFAS_BASE.length; tIdx++) {
         let concluido = false;
         
         if (isFullyFinished) {
            concluido = true;
         } else {
            if (tIdx < Math.floor(Math.random() * 5)) {
              concluido = true;
            }
         }

         tarefasInsertBatch.push({
            ordem_id: ofRow.id,
            nome_tarefa: TAREFAS_BASE[tIdx],
            ordem_index: tIdx,
            concluido: concluido
         });
       }
    }

    const chunkSize = 180;
    for (let i = 0; i < tarefasInsertBatch.length; i += chunkSize) {
      const chunk = tarefasInsertBatch.slice(i, i + chunkSize);
      const { error: tErr } = await supabase.from('tarefas').insert(chunk);
      if (tErr) {
        console.error("Erro a criar Tarefas", tErr);
      }
    }
  }

  console.log("\n✅ Geração Massiva Terminada com Sucesso!");
}

generateData();
