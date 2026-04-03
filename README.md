# Nexar

Aplicação de arquitetura híbrida (Desenvolvida em Tauri + React) para controlo, monitorização e gestão global de Produção de Fábrica.
Criada para otimizar os ecrãs dispersos de estaleiro e organizar Obras e O.F.s num ambiente Premium e focado puramente em UX/UI tátil e percetível de alto contraste.

## Funcionalidades Principais
* **Gestão Multinível:** Camadas isoladas de (Projetos Mestre -> Ordens de Fabrico -> Tarefas Departamentais).
* **Base de Dados Assíncrona:** Integrado com Motor Supabase (PostgresSQL) para acesso de base de dados escalável e global.
* **Exportações Flexíveis:** Exportação massiva em formatos JSON e relatórios XLSX (Excel) moldados à medida.
* **Segurança e Prevenção:** Modais anti-erro customizados (eliminações dependentes de _Match_ literal de texto e Barras de Progresso de confirmação forçada em 2 Segundos em processos de fecho).
* **Analytics Color-Coded:** Identificação visual imaculada das O.F.s, seja por Cores Semânticas de % de Fecho, seja pela data de passividade dos projetos (>14 dias Alertas Amarelos, >21 Dias vermelhos).
* **Sweeper Automático:** Motor interno que em pano de fundo, analisa bases acabadas. Uma Obra 100% finalizada intocável por mais de 7 dias recolhe-se pacificamente para o Sistema Arquivo da App sem interferência humana.

---

## Histórico de Fases de Desenvolvimento

Este projeto foi construído e trabalhado de forma modular:

### Fase 1: Fundação
* Setup do ecossistema base (Tauri v2 + React 18 + Vite).
* Implementação do Design System via TailwindCSS.
* Ligação e desenho estrutural na BD da Cloud "Supabase" (`projectos`, `ordens_fabrico` e `tarefas` ligadas por Foreign Keys).
* Escrita dos serviços essenciais de CRUD.

### Fase 2: Navegação e Interface
* Programação da Sidebar Mestra e construção do layout adaptável.
* Páginas de Acesso `OfView` (para a Gestão cirúrgica de checkboxes de cada Tarefa: Modelação, Montagem, Validação...).
* Página de Projeto (`ProjectView`), com vista agregada e navegação fácil sem andar para trás e para a frente.
* Extratores e Geradores de Excel nativos, escrevendo na Sheet e pintando as linhas de forma fluída e percetível.

### Fase 3: HUB e Analytics de Topo
* Substituição absoluta do vazio inicial por um **GlobalDashboard** em Grelha (*Masonry/Grid Dashboard*), que sumariza todo o motor industrial em cartões. O utilizador no arranque tem imediata perceção de onde investir a mão-de-obra.
* Separação de estados "Ativo/Arquivo", filtragem global de informação para não poluir os gestores.
* Refatoração massiva de títulos para garantir a hierarquia humana: Prioridade de Leitura aos nomes Cívis, colocando _Tags GSxxxx_ em segundo plano organizativo.
* Injeção da ordenação cronometrada (*Obras Ativas mais antigas flutuam para o Topo dos painéis* para escoamento logístico prioritário).

### Fase 4: O Refinamento Premium (Polishing)
* Abandono total de componentes Web Nativops (Como `window.prompt` e `window.confirm`) a favor de componentes Gráficos **Modal** embebidos.
* Animações ricas e _Hover States_ para evitar uma grelha mecânica morta.
* Algoritmo de restauro (Tentativa de criação de obra antiga puxa automaticamente essa obra do lixo para as mãos do operador sem chatear).
* **Scrollbars Black Custom** (As barras de Windows fundem-se no design Dark e evitam cortar o Flow Visual).
* Criação de Seed Automático - Simulação com scripts locais criados para espalhar dezenas de Obras ao longo dum mês e testar os limites logísticos perante falhas temporais.

---
> **Tech Stack:** React, Tailwind CSS, TypeScript, Supabase, Lucide Icons, Xlsx, Tauri.
