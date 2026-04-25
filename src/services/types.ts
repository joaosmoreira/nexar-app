export interface Projeto {
  id: number;
  user_id: string;
  nome: string;
  cliente: string;
  criado_em: string;
  anexo_url?: string | null;
  arquivado?: boolean;
  informacoes_gerais?: string;
  ordem_index?: number;
  ultimo_movimento?: string;
}

export interface OrdemFabrico {
  id: number;
  projeto_id: number;
  nome_of: string;
  numero_of: string;
  status: string;
  criado_em: string;
  prazo_limite?: string | null;
  tarefas?: Tarefa[];
  notas?: string;
  anexo_url?: string | null;
  progress?: number;
}

export interface Tarefa {
  id: number;
  ordem_id: number;
  nome_tarefa: string;
  concluido: boolean;
  ordem_index: number;
}

export interface UserWithRole {
  user_id: string;
  email: string;
  nome?: string;
  role: 'admin' | 'user';
}

export type UserRole = 'admin' | 'user';
