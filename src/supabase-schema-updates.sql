-- 5. Adicionar a funcionalidade Arquivo à Tabela de Projetos
ALTER TABLE public.projectos ADD COLUMN arquivado boolean DEFAULT false;
