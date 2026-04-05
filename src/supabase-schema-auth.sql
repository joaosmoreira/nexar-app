-- ATENÇÃO: EXECUTA ESTE SCRIPT NO EDITOR "SQL EDITOR" DO TEU PAINEL SUPABASE.

-- 1. APAGAR AS TABELAS ANTIGAS PARA PREVENIR ERROS DE MIGRAÇÃO
-- Dado que vais usar isto de fresco, limpa logo as tabelas para criar as colunas corretamente.
DROP TABLE IF EXISTS public.tarefas;
DROP TABLE IF EXISTS public.ordens_fabrico;
DROP TABLE IF EXISTS public.projectos;

-- 2. RECRIAR TABELAS COM LIGAÇÃO AO UTILIZADOR (user_id)
-- Toda a gente partilha as tabelas de projectos, ordens_fabrico e tarefas, 
-- mas cada registo guarda OBRIGATORIAMENTE o seu "dono" (user_id).

CREATE TABLE public.projectos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  nome text NOT NULL,
  cliente text,
  arquivado boolean DEFAULT false,
  ultimo_movimento timestamp with time zone DEFAULT now(),
  criado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ordens_fabrico (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  projeto_id bigint REFERENCES public.projectos(id) ON DELETE CASCADE NOT NULL,
  nome_of text NOT NULL,
  numero_of text NOT NULL,
  status text DEFAULT 'pendente',
  criado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tarefas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  ordem_id bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido boolean DEFAULT false,
  ordem_index int8 NOT NULL
);

-- 3. ACTIVAR O ROW LEVEL SECURITY (RLS)
-- Isto é a magia do Supabase que separa os dados entre contas.
ALTER TABLE public.projectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_fabrico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR AS POLÍTICAS (REGRAS) QUE LIMITAM A VISIBILIDADE DOS DADOS

-- Para Projetos: Um utilizador só pode ver, editar ou apagar um projeto de for o criador dele.
CREATE POLICY "Utilizador só pode gerir os seus Projetos"
ON public.projectos
FOR ALL USING (auth.uid() = user_id);

-- Para Ordens de Fabrico: Idem
CREATE POLICY "Utilizador só pode gerir as suas Ordens"
ON public.ordens_fabrico
FOR ALL USING (auth.uid() = user_id);

-- Para Tarefas: Idem
CREATE POLICY "Utilizador só pode gerir as suas Tarefas"
ON public.tarefas
FOR ALL USING (auth.uid() = user_id);
