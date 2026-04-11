-- ══════════════════════════════════════════════════════════════════════
--  NEXAR HUB — Schema Supabase Completo (Modo NÃO-DESTRUTIVO)
--  Versão: 2.1 (com Auth Multi-Utilizador, RLS + Informações Gerais)
--  Executar no painel: Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 1 — Criar tabelas caso não existam (Seguro: Não apaga dados)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projectos (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  nome            text NOT NULL,
  cliente         text,
  arquivado       boolean DEFAULT false,
  ultimo_movimento timestamp with time zone DEFAULT now(),
  criado_em       timestamp with time zone DEFAULT now()
);

-- Assegura que a coluna "informacoes_gerais" existe sempre na tabela
ALTER TABLE public.projectos ADD COLUMN IF NOT EXISTS informacoes_gerais text;

CREATE TABLE IF NOT EXISTS public.ordens_fabrico (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  projeto_id  bigint REFERENCES public.projectos(id) ON DELETE CASCADE NOT NULL,
  nome_of     text NOT NULL,
  numero_of   text NOT NULL,
  status      text DEFAULT 'pendente',
  criado_em   timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tarefas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  ordem_id    bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido   boolean DEFAULT false,
  ordem_index int8 NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 2 — Ativar Row Level Security (RLS) em todas as tabelas
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.projectos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_fabrico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas          ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 3 — Políticas de acesso (um utilizador só gere os seus dados)
-- 
--  (Usa o bloco genérico DO para evitar erros se a política já existir)
-- ─────────────────────────────────────────────────────────────────────
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Utilizador só pode gerir os seus Projetos' AND tablename = 'projectos') THEN
    CREATE POLICY "Utilizador só pode gerir os seus Projetos" ON public.projectos FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Utilizador só pode gerir as suas Ordens' AND tablename = 'ordens_fabrico') THEN
    CREATE POLICY "Utilizador só pode gerir as suas Ordens" ON public.ordens_fabrico FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Utilizador só pode gerir as suas Tarefas' AND tablename = 'tarefas') THEN
    CREATE POLICY "Utilizador só pode gerir as suas Tarefas" ON public.tarefas FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
--  ESTRUTURA FINAL DAS TABELAS (Referência Rápida Atualizada v2.1)
-- ══════════════════════════════════════════════════════════════════════
--
--  projectos
--  ├── id                 bigint PK
--  ├── user_id            uuid FK → auth.users (RLS)
--  ├── nome               text       ex: "GS1522 - Garsteel Escadas"
--  ├── cliente            text       ex: "Garsteel"
--  ├── arquivado          boolean    false = ativo, true = arquivado
--  ├── informacoes_gerais text       [NOVO] notas da obra
--  ├── ultimo_movimento   timestamp  atualizado em cada interação
--  └── criado_em          timestamp
--
--  ordens_fabrico
--  ├── id          bigint PK
--  ├── user_id     uuid FK → auth.users (RLS)
--  ├── projeto_id  bigint FK → projectos(id) ON DELETE CASCADE
--  ├── nome_of     text       ex: "Estrutura Principal"
--  ├── numero_of   text       ex: "OF-2024-001"
--  ├── status      text       'pendente' | 'em_progresso' | 'concluido'
--  └── criado_em   timestamp
--
--  tarefas
--  ├── id          bigint PK
--  ├── user_id     uuid FK → auth.users (RLS)
--  ├── ordem_id    bigint FK → ordens_fabrico(id) ON DELETE CASCADE
--  ├── nome_tarefa text       ex: "Modelação", "Fabrico", "Montagem"
--  ├── concluido   boolean
--  └── ordem_index int8       ordenação manual (0-5 pré-definidos)
-- ══════════════════════════════════════════════════════════════════════