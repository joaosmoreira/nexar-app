-- =====================================================================
--  NEXAR HUB - Schema Supabase (Modo SEGURO / NAO-DESTRUTIVO)
--  Versao: 3.1 (RBAC - Role Based Access Control)
--  Seguro para executar em bases de dados com dados existentes
--  Sem DROP TABLE, DELETE ou TRUNCATE
--  Usa IF NOT EXISTS em todo o lado
-- =====================================================================


-- ---------------------------------------------------------------------
--  PASSO 1 - Tabelas Base
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.projectos (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  nome             text NOT NULL,
  cliente          text,
  arquivado        boolean DEFAULT false,
  ultimo_movimento timestamp with time zone DEFAULT now(),
  criado_em        timestamp with time zone DEFAULT now()
);

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

ALTER TABLE public.ordens_fabrico ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.ordens_fabrico ADD COLUMN IF NOT EXISTS prazo_limite timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.tarefas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  ordem_id    bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido   boolean DEFAULT false,
  ordem_index int8 NOT NULL
);


-- ---------------------------------------------------------------------
--  PASSO 2 - Tabela de Roles (RBAC)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role    text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  email   text NOT NULL
);


-- ---------------------------------------------------------------------
--  PASSO 3 - Funcoes Auxiliares
-- ---------------------------------------------------------------------

-- Verifica se o utilizador autenticado e admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria automaticamente um registo em user_roles apos novo registo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------
--  PASSO 4 - Trigger para novos utilizadores (apenas se nao existir)
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;


-- ---------------------------------------------------------------------
--  PASSO 5 - Row Level Security (ativar RLS)
-- ---------------------------------------------------------------------

ALTER TABLE public.projectos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_fabrico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
--  PASSO 6 - Politicas RLS (criadas apenas se nao existirem)
-- ---------------------------------------------------------------------

DO $$
BEGIN

  -- Projectos: remove policy antiga (sem suporte admin) se existir
  DROP POLICY IF EXISTS "Utilizador so pode gerir os seus Projetos" ON public.projectos;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projectos'
      AND policyname = 'Acesso Total Projectos (User ou Admin)'
  ) THEN
    CREATE POLICY "Acesso Total Projectos (User ou Admin)" ON public.projectos
      FOR ALL USING (auth.uid() = user_id OR public.is_admin());
  END IF;

  -- Ordens de Fabrico
  DROP POLICY IF EXISTS "Utilizador so pode gerir as suas Ordens" ON public.ordens_fabrico;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ordens_fabrico'
      AND policyname = 'Acesso Total Ordens (User ou Admin)'
  ) THEN
    CREATE POLICY "Acesso Total Ordens (User ou Admin)" ON public.ordens_fabrico
      FOR ALL USING (auth.uid() = user_id OR public.is_admin());
  END IF;

  -- Tarefas
  DROP POLICY IF EXISTS "Utilizador so pode gerir as suas Tarefas" ON public.tarefas;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tarefas'
      AND policyname = 'Acesso Total Tarefas (User ou Admin)'
  ) THEN
    CREATE POLICY "Acesso Total Tarefas (User ou Admin)" ON public.tarefas
      FOR ALL USING (auth.uid() = user_id OR public.is_admin());
  END IF;

  -- User Roles: leitura (proprio ou admin)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles' AND policyname = 'Leitura de Roles'
  ) THEN
    CREATE POLICY "Leitura de Roles" ON public.user_roles
      FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
  END IF;

  -- User Roles: escrita (apenas admin)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles' AND policyname = 'Admin gere Roles'
  ) THEN
    CREATE POLICY "Admin gere Roles" ON public.user_roles
      FOR UPDATE USING (public.is_admin());
  END IF;

END $$;


-- =====================================================================
--  APOS EXECUTAR - Promover o primeiro administrador manualmente:
--
--  UPDATE public.user_roles
--  SET role = 'admin'
--  WHERE email = 'o-teu-email@empresa.com';
--
-- =====================================================================
