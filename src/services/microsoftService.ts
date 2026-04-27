import { supabase } from '@/supabaseClient';

const CLIENT_ID = '5307078e-6b2d-47c1-90ff-7a709ab0b543';
const REDIRECT_URI = 'http://localhost:1420'; 
const SCOPES = ['User.Read', 'Mail.Read', 'offline_access'];

export const microsoftService = {
  /**
   * Gera um code_verifier e um code_challenge para o fluxo PKCE
   */
  async generatePKCE() {
    const verifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    return { verifier, challenge };
  },

  /**
   * Inicia o fluxo de login do Microsoft Outlook com PKCE
   */
  async login() {
    const { verifier, challenge } = await this.generatePKCE();
    
    // Guardar verifier temporariamente (ex: sessionStorage)
    sessionStorage.setItem('ms_code_verifier', verifier);

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` + 
      `client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256`;
    
    window.location.href = authUrl;
  },

  /**
   * Troca o código de autorização por um Access Token
   */
  async exchangeCodeForToken(code: string) {
    const verifier = sessionStorage.getItem('ms_code_verifier');
    
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: verifier || '',
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description);
    
    return data; // Contém access_token, refresh_token, expires_in
  },

  /**
   * Obtém os emails marcados (Flagged)
   */
  async getFlaggedEmails(accessToken: string) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$filter=flag/flagStatus eq \'flagged\'&$select=id,subject,bodyPreview,webLink,flag,receivedDateTime', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao obter emails do Outlook');
    }

    const data = await response.json();
    return data.value;
  },

  /**
   * Sincroniza emails marcados com a base de dados do Nexar HUB
   */
  async syncFlaggedEmails(accessToken: string) {
    const emails = await this.getFlaggedEmails(accessToken);
    let count = 0;

    for (const email of emails) {
      const projectRef = this.extractProjectRef(email.subject);
      if (!projectRef) continue;

      // 1. Procurar projeto correspondente (GSXXXX)
      const { data: project } = await supabase
        .from('projectos')
        .select('id')
        .ilike('nome', `${projectRef}%`)
        .maybeSingle();

      if (!project) continue;

      // 2. Verificar se este email já foi processado (pelo external_id)
      // Procuramos tanto em OFs como em Tarefas
      const { data: existingOf } = await supabase.from('ordens_fabrico').select('id').eq('external_id', email.id).maybeSingle();
      const { data: existingTask } = await supabase.from('tarefas').select('id').eq('external_id', email.id).maybeSingle();
      if (existingOf || existingTask) continue;

      // 3. Tentar extrair número de OF do assunto (ex: "OF 2024001")
      const ofMatch = email.subject.match(/OF\s?(\d+)/i);
      const ofNumber = ofMatch ? ofMatch[1] : null;

      if (ofNumber) {
        // Procurar se a OF já existe neste projeto
        const { data: of } = await supabase
          .from('ordens_fabrico')
          .select('id')
          .eq('projeto_id', project.id)
          .eq('numero_of', ofNumber)
          .maybeSingle();

        if (of) {
          // Adicionar como tarefa na OF existente
          await supabase.from('tarefas').insert({
            ordem_id: of.id,
            nome_tarefa: email.subject,
            external_source: 'outlook',
            external_id: email.id,
            external_link: email.webLink,
            ordem_index: 0
          });
          count++;
        } else {
          // Criar nova OF com base no email
          const { data: newOf } = await supabase.from('ordens_fabrico').insert({
            projeto_id: project.id,
            nome_of: email.subject,
            numero_of: ofNumber,
            external_source: 'outlook',
            external_id: email.id,
            external_link: email.webLink,
            notas: email.bodyPreview
          }).select().single();

          if (newOf) {
            await supabase.from('tarefas').insert({
              ordem_id: newOf.id,
              nome_tarefa: "Analisar pedido do email",
              ordem_index: 0
            });
            count++;
          }
        }
      } else {
        // Sem OF no título -> Criar uma OF com o assunto do email marcada como OUTLOOK
        await supabase.from('ordens_fabrico').insert({
          projeto_id: project.id,
          nome_of: email.subject,
          numero_of: 'EMAIL',
          external_source: 'outlook',
          external_id: email.id,
          external_link: email.webLink,
          notas: email.bodyPreview
        });
        count++;
      }
    }
    return count;
  },

  /**
   * Simulação interna para ambiente de desenvolvimento
   * Permite testar a lógica de parsing e criação sem precisar do Outlook real
   */
  async simulateOutlookSync(testSubject: string) {
    console.log('A simular sincronização para:', testSubject);
    
    const mockEmail = {
      id: 'MOCK-' + Math.random().toString(36).substring(2, 9),
      subject: testSubject,
      bodyPreview: 'Este é um corpo de email simulado para testes de desenvolvimento.',
      webLink: 'https://outlook.office.com/mock-link'
    };

    const projectRef = this.extractProjectRef(mockEmail.subject) || 'GS0000';
    
    // 1. Procurar projeto
    const { data: existingProject } = await supabase
      .from('projectos')
      .select('id, user_id')
      .ilike('nome', `${projectRef}%`)
      .maybeSingle();

    let project = existingProject;

    // 2. Se não existir, criar projeto automático
    if (!project) {
      console.log(`Projeto ${projectRef} não encontrado. A criar novo projeto...`);
      const { data: newProject, error: createError } = await supabase
        .from('projectos')
        .insert({
          nome: projectRef === 'GS0000' ? 'GS0000 - Pedidos Gerais' : `${projectRef} - Obra Automática`,
          cliente: 'Criado via Outlook',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id, user_id')
        .single();

      if (createError) throw new Error(`Erro ao criar projeto automático: ${createError.message}`);
      project = newProject;
    }

    // 3. Tentar extrair OF
    const ofMatch = mockEmail.subject.match(/OF\s?(\d+)/i);
    const ofNumber = ofMatch ? ofMatch[1] : null;
    const cleanTitle = this.cleanSubject(mockEmail.subject);

    if (ofNumber) {
      const { data: existingOf } = await supabase
        .from('ordens_fabrico')
        .select('id')
        .eq('projeto_id', project.id)
        .eq('numero_of', ofNumber)
        .maybeSingle();

      if (existingOf) {
        // 1. Adicionar tarefa
        await supabase.from('tarefas').insert({
          ordem_id: existingOf.id,
          user_id: project.user_id,
          nome_tarefa: cleanTitle || 'Novo pedido via Outlook',
          external_source: 'outlook',
          external_id: mockEmail.id,
          external_link: mockEmail.webLink,
          ordem_index: 0
        });

        // 2. Acrescentar corpo do email às notas da OF existente
        const { data: currentOf } = await supabase.from('ordens_fabrico').select('notas').eq('id', existingOf.id).single();
        const novaNota = currentOf?.notas 
          ? `${currentOf.notas}\n\n[OUTLOOK_MSG]\n${mockEmail.bodyPreview}`
          : `[OUTLOOK_MSG]\n${mockEmail.bodyPreview}`;
        
        await supabase.from('ordens_fabrico').update({ notas: novaNota }).eq('id', existingOf.id);
      } else {
        const { data: newOf } = await supabase.from('ordens_fabrico').insert({
          projeto_id: project.id,
          user_id: project.user_id,
          nome_of: cleanTitle || `Ordem de Fabrico ${ofNumber}`,
          numero_of: ofNumber,
          external_source: 'outlook',
          external_id: mockEmail.id,
          external_link: mockEmail.webLink,
          notas: `[OUTLOOK_MSG]\n${mockEmail.bodyPreview}`
        }).select().single();

        if (newOf) {
          await supabase.from('tarefas').insert({
            ordem_id: newOf.id,
            user_id: project.user_id,
            nome_tarefa: "Analisar pedido via Outlook",
            ordem_index: 0
          });
        }
      }
    } else {
      await supabase.from('ordens_fabrico').insert({
        projeto_id: project.id,
        user_id: project.user_id,
        nome_of: cleanTitle || 'Pedido via Outlook',
        numero_of: 'EMAIL',
        external_source: 'outlook',
        external_id: mockEmail.id,
        external_link: mockEmail.webLink,
        notas: mockEmail.bodyPreview
      });
    }

    return true;
  },

  /**
   * Limpa o assunto do email para remover códigos redundantes (GSXXXX, OF XXXX)
   */
  cleanSubject(subject: string): string {
    return subject
      .replace(/\bGS\d{4}\b/gi, '') // Remove GSXXXX
      .replace(/\bOF\s?\d+\b/gi, '') // Remove OF XXXX
      .replace(/^[\s\-_|:]+/, '')    // Remove lixo no início (traços, espaços)
      .replace(/[\s\-_|:]+$/, '')    // Remove lixo no fim
      .replace(/\s{2,}/g, ' ')       // Remove espaços duplos
      .trim();
  },

  /**
   * Tenta extrair um padrão GSXXXX do assunto de um email
   */
  extractProjectRef(subject: string): string | null {
    const match = subject.match(/\bGS\d{4}\b/i);
    return match ? match[0].toUpperCase() : null;
  }
};
