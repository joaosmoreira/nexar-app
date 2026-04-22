import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMINS = [
  { nome: 'Ricardo Santos', email: 'ricardosantos@admin.pt' },
  { nome: 'Ana Oliveira', email: 'anaoliveira@admin.pt' }
];

const USERS = [
  { nome: 'Carlos Ferreira', email: 'carlosferreira@user.pt' },
  { nome: 'Sofia Martins', email: 'sofiamartins@user.pt' },
  { nome: 'Pedro Costa', email: 'pedrocosta@user.pt' },
  { nome: 'Maria Rodrigues', email: 'mariarodrigues@user.pt' },
  { nome: 'Bruno Silva', email: 'brunosilva@user.pt' },
  { nome: 'Helena Pereira', email: 'helenapereira@user.pt' }
];

async function seedUsers() {
  console.log('👥 Iniciando criação de utilizadores...');

  const allUsers = [
    ...ADMINS.map(u => ({ ...u, role: 'admin' })),
    ...USERS.map(u => ({ ...u, role: 'user' }))
  ];

  for (const user of allUsers) {
    console.log(`Provessando: ${user.email} (${user.role})`);

    // 1. Criar utilizador no Auth (com email já confirmado)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Nexar2024!',
      email_confirm: true,
      user_metadata: { full_name: user.nome }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`ℹ️ O utilizador ${user.email} já existe.`);
        // Mesmo que exista, vamos garantir que o cargo está correto na tabela pública
        const { data: existingUser } = await supabase.from('user_roles').select('user_id').eq('email', user.email).single();
        if (existingUser) {
           await supabase.from('user_roles').update({ role: user.role }).eq('user_id', existingUser.user_id);
        }
      } else {
        console.error(`❌ Erro ao criar ${user.email}:`, authError.message);
      }
      continue;
    }

    if (authData.user) {
      // 2. O trigger handle_new_user já deve ter inserido o user em user_roles como 'user'
      // Precisamos de atualizar para 'admin' se for o caso
      if (user.role === 'admin') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', authData.user.id);
        
        if (roleError) console.error(`❌ Erro ao promover ${user.email}:`, roleError.message);
      }
      console.log(`✅ Utilizador criado: ${user.email}`);
    }
  }

  console.log('✨ Processo de utilizadores concluído!');
}

seedUsers();
