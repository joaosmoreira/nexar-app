import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function redistribute() {
  console.log('🔄 Iniciando redistribuição de obras...');

  // 1. Obter todos os utilizadores (exceto o admin principal)
  const { data: users } = await supabase
    .from('user_roles')
    .select('user_id, email')
    .neq('email', 'admin@admin.pt');

  const { data: adminPrincipal } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('email', 'admin@admin.pt')
    .single();

  if (!users || users.length === 0 || !adminPrincipal) {
    console.error('❌ Erro: Utilizadores não encontrados.');
    return;
  }

  // 2. Obter todas as obras GS20xx
  const { data: projetos } = await supabase
    .from('projectos')
    .select('id, nome')
    .ilike('nome', 'GS20%')
    .order('nome', { ascending: true });

  if (!projetos || projetos.length === 0) {
    console.error('❌ Erro: Nenhuma obra encontrada para redistribuir.');
    return;
  }

  console.log(`Encontradas ${projetos.length} obras para distribuir por ${users.length} utilizadores.`);

  // 3. Redistribuir
  for (let i = 0; i < projetos.length; i++) {
    const projeto = projetos[i];
    let targetUserId: string;

    if (i === 0) {
      // A primeira obra fica com o admin principal
      targetUserId = adminPrincipal.user_id;
      console.log(`📌 Obra ${projeto.nome} mantida no Admin Principal.`);
    } else {
      // As outras vão para os novos users/admins
      const randomUser = users[Math.floor(Math.random() * users.length)];
      targetUserId = randomUser.user_id;
      console.log(`🚚 Obra ${projeto.nome} atribuída a: ${randomUser.email}`);
    }

    // Atualizar Projeto
    await supabase.from('projectos').update({ user_id: targetUserId }).eq('id', projeto.id);

    // Atualizar OFs do projeto
    const { data: ofs } = await supabase.from('ordens_fabrico').select('id').eq('projeto_id', projeto.id);
    if (ofs && ofs.length > 0) {
      const ofIds = ofs.map(o => o.id);
      await supabase.from('ordens_fabrico').update({ user_id: targetUserId }).eq('projeto_id', projeto.id);
      
      // Atualizar Tarefas das OFs
      await supabase.from('tarefas').update({ user_id: targetUserId }).in('ordem_id', ofIds);
    }
  }

  console.log('✨ Redistribuição concluída!');
}

redistribute();
