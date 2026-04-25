-- =====================================================================
--  NEXAR HUB - Schema Supabase (Versao 3.4 - INTEGRAL & VERIFICADA)
--  Esta versao foi auditada contra todos os ficheiros de servico:
--  - projectService.ts, ofService.ts, taskService.ts, userService.ts, metricsService.ts
-- =====================================================================

-- ---------------------------------------------------------------------
--  PASSO 0 - Extensoes (Opcionais mas Recomendadas)
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------
--  PASSO 1 - Tabelas Base (Auditadas contra types.ts)
-- ---------------------------------------------------------------------

-- Tabela: Projectos
CREATE TABLE IF NOT EXISTS public.projectos (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  nome             text NOT NULL,
  cliente          text,
  anexo_url        text,
  arquivado        boolean DEFAULT false,
  ordem_index      int8 DEFAULT 0,
  ultimo_movimento timestamp with time zone DEFAULT now(),
  criado_em        timestamp with time zone DEFAULT now(),
  informacoes_gerais text
);

-- Tabela: Ordens de Fabrico
CREATE TABLE IF NOT EXISTS public.ordens_fabrico (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  projeto_id   bigint REFERENCES public.projectos(id) ON DELETE CASCADE NOT NULL,
  nome_of      text NOT NULL,
  numero_of    text NOT NULL,
  status       text DEFAULT 'pendente',
  notas        text,
  anexo_url    text,
  prazo_limite timestamp with time zone,
  criado_em    timestamp with time zone DEFAULT now(),
  ordem_index  int8 DEFAULT 0
);

-- Tabela: Tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  ordem_id    bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido   boolean DEFAULT false,
  ordem_index int8 NOT NULL
);

-- Tabela: User Roles (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role    text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  email   text NOT NULL,
  nome    text
);

-- ---------------------------------------------------------------------
--  PASSO 2 - Funcoes Auxiliares e RPC (Auditadas contra servicos)
-- ---------------------------------------------------------------------

-- RPC: Verifica se e Admin
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

-- Trigger: Preencher nome via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, nome, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (user_id) DO UPDATE SET nome = EXCLUDED.nome;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC: Reordenacao generica (Chamada em projectService e ofService)
CREATE OR REPLACE FUNCTION public.reorder_items(
  table_name text,
  updates jsonb
)
RETURNS void AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    EXECUTE format('UPDATE public.%I SET ordem_index = %L WHERE id = %L', 
      table_name, 
      (item->>'ordem_index')::int8, 
      (item->>'id')::bigint
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao de Trigger: Atualiza movimento do projeto
CREATE OR REPLACE FUNCTION public.update_project_movement()
RETURNS trigger AS $$
DECLARE
  target_project_id bigint;
BEGIN
  IF (TG_TABLE_NAME = 'ordens_fabrico') THEN
    target_project_id := NEW.projeto_id;
  ELSIF (TG_TABLE_NAME = 'tarefas') THEN
    SELECT projeto_id INTO target_project_id FROM public.ordens_fabrico WHERE id = NEW.ordem_id;
  END IF;

  IF target_project_id IS NOT NULL THEN
    UPDATE public.projectos 
    SET ultimo_movimento = now() 
    WHERE id = target_project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------
--  PASSO 3 - Triggers
-- ---------------------------------------------------------------------

-- Trigger: Auth Users -> User Roles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Atualizar movimento ao mexer em OFs
DROP TRIGGER IF EXISTS trigger_update_movement_of ON public.ordens_fabrico;
CREATE TRIGGER trigger_update_movement_of
  AFTER INSERT OR UPDATE ON public.ordens_fabrico
  FOR EACH ROW EXECUTE FUNCTION public.update_project_movement();

-- Trigger: Atualizar movimento ao mexer em Tarefas
DROP TRIGGER IF EXISTS trigger_update_movement_task ON public.tarefas;
CREATE TRIGGER trigger_update_movement_task
  AFTER INSERT OR UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.update_project_movement();

-- ---------------------------------------------------------------------
--  PASSO 4 - Seguranca (RLS e Permissoes)
-- ---------------------------------------------------------------------

-- Ativar RLS
ALTER TABLE public.projectos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_fabrico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;

-- Politicas: Projectos
DROP POLICY IF EXISTS "Acesso Total Projectos" ON public.projectos;
CREATE POLICY "Acesso Total Projectos" ON public.projectos
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Politicas: Ordens de Fabrico
DROP POLICY IF EXISTS "Acesso Total Ordens" ON public.ordens_fabrico;
CREATE POLICY "Acesso Total Ordens" ON public.ordens_fabrico
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Politicas: Tarefas
DROP POLICY IF EXISTS "Acesso Total Tarefas" ON public.tarefas;
CREATE POLICY "Acesso Total Tarefas" ON public.tarefas
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Politicas: User Roles
DROP POLICY IF EXISTS "Leitura Roles" ON public.user_roles;
CREATE POLICY "Leitura Roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Escrita Roles (Admin)" ON public.user_roles;
CREATE POLICY "Escrita Roles (Admin)" ON public.user_roles
  FOR UPDATE USING (public.is_admin());

-- ---------------------------------------------------------------------
--  PASSO 5 - Permissoes de Execucao (Essencial para RPC no Supabase)
-- ---------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================================
--  DICA: Para promover um Admin manualmente execute:
--  UPDATE public.user_roles SET role = 'admin' WHERE email = 'teu@email.com';
-- =====================================================================
