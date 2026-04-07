-- ══════════════════════════════════════════════════════════════════════
--  NEXAR HUB — Schema Supabase Completo
--  Versão: 2.0 (com Auth Multi-Utilizador + RLS)
--  Executar no painel: Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 1 — Limpar tabelas existentes (manter a ordem por causa das FKs)
-- ─────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.tarefas;
DROP TABLE IF EXISTS public.ordens_fabrico;
DROP TABLE IF EXISTS public.projectos;

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 2 — Criar tabelas com isolamento por utilizador (user_id)
--
--  Cada registo pertence ao utilizador que o criou.
--  O campo `user_id` é preenchido automaticamente pelo Supabase Auth
--  via `auth.uid()`. Nenhum utilizador consegue ver dados de outro.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.projectos (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  nome            text NOT NULL,
  cliente         text,
  arquivado       boolean DEFAULT false,
  ultimo_movimento timestamp with time zone DEFAULT now(),
  criado_em       timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ordens_fabrico (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  projeto_id  bigint REFERENCES public.projectos(id) ON DELETE CASCADE NOT NULL,
  nome_of     text NOT NULL,
  numero_of   text NOT NULL,
  status      text DEFAULT 'pendente',
  criado_em   timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tarefas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  ordem_id    bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido   boolean DEFAULT false,
  ordem_index int8 NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 3 — Ativar Row Level Security (RLS) em todas as tabelas
--
--  Sem RLS ativo, qualquer utilizador autenticado podia ler todos os dados.
--  Com RLS, cada linha só é acessível ao seu dono.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.projectos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_fabrico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas          ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
--  PASSO 4 — Políticas de acesso (um utilizador só gere os seus dados)
-- ─────────────────────────────────────────────────────────────────────

-- Projetos: CRUD restrito ao criador
CREATE POLICY "Utilizador só pode gerir os seus Projetos"
  ON public.projectos
  FOR ALL
  USING (auth.uid() = user_id);

-- Ordens de Fabrico: CRUD restrito ao criador
CREATE POLICY "Utilizador só pode gerir as suas Ordens"
  ON public.ordens_fabrico
  FOR ALL
  USING (auth.uid() = user_id);

-- Tarefas: CRUD restrito ao criador
CREATE POLICY "Utilizador só pode gerir as suas Tarefas"
  ON public.tarefas
  FOR ALL
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════
--  ESTRUTURA FINAL DAS TABELAS (Referência Rápida)
-- ══════════════════════════════════════════════════════════════════════
--
--  projectos
--  ├── id              bigint PK
--  ├── user_id         uuid FK → auth.users (RLS)
--  ├── nome            text       ex: "GS1522 - Garsteel Escadas"
--  ├── cliente         text       ex: "Garsteel"
--  ├── arquivado       boolean    false = ativo, true = arquivado
--  ├── ultimo_movimento timestamp  atualizado em cada interação
--  └── criado_em       timestamp
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
--
--  Tarefas pré-definidas por OF (criadas automaticamente):
--    0 - Modelação
--    1 - Aprovisionamento Material
--    2 - Validação
--    3 - Fabrico
--    4 - Parafusaria
--    5 - Montagem
-- ══════════════════════════════════════════════════════════════════════