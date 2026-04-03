-- 1. Apaga as tabelas antigas (a ordem importa por causa das relações)
DROP TABLE IF EXISTS public.tarefas;
DROP TABLE IF EXISTS public.ordens_fabrico;
DROP TABLE IF EXISTS public.projectos;

-- 2. Cria a tabela de Projectos
CREATE TABLE public.projectos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL,
  cliente text,
  criado_em timestamp with time zone DEFAULT now()
);

-- 3. Cria a tabela de Ordens de Fabrico
CREATE TABLE public.ordens_fabrico (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  projeto_id bigint REFERENCES public.projectos(id) ON DELETE CASCADE NOT NULL,
  nome_of text NOT NULL,
  numero_of text NOT NULL,
  status text DEFAULT 'pendente',
  criado_em timestamp with time zone DEFAULT now()
);

-- 4. Cria a tabela de Tarefas (com as colunas que faltavam)
CREATE TABLE public.tarefas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id bigint REFERENCES public.ordens_fabrico(id) ON DELETE CASCADE NOT NULL,
  nome_tarefa text NOT NULL,
  concluido boolean DEFAULT false,
  ordem_index int8 NOT NULL
);

-- 5. Adicionar a funcionalidade Arquivo à Tabela de Projetos
ALTER TABLE public.projectos ADD COLUMN arquivado boolean DEFAULT false;

-- 6. Adicionar a funcionalidade de Correr Lista de Últimos Movimentos
ALTER TABLE public.projectos ADD COLUMN ultimo_movimento timestamp with time zone DEFAULT now();