# Relatório de Auditoria e Otimização — Nexar HUB

Este relatório consolida a verificação global de todo o código da aplicação **work-manager**, focando-se na identificação de elementos não utilizados (código morto) e propondo melhorias arquiteturais para o futuro.

## 1. Higiene do Código (Elementos Não Utilizados)

A base de código atual (React, TypeScript e Tauri) encontra-se num excelente estado de limpeza. Após uma auditoria rigorosa do compilador (`tsc --noUnusedLocals --noUnusedParameters`), não foram detetadas variáveis, parâmetros ou importações órfãs nos componentes principais.

No entanto, a um nível macro (ficheiros e pastas), foram identificados os seguintes elementos que não fazem parte do *runtime* da aplicação:

### 1.1. Pasta `scripts/` (Obsoleta/Desenvolvimento)
Os seguintes ficheiros na pasta `scripts/` não são consumidos pela aplicação em execução e servem apenas propósitos de *seeding* ou manutenção isolada da base de dados:
*   `seed.ts`
*   `backdate.ts`
*   `randomizeDates.ts`
*   `install-mac.command`

**Ação Sugerida:** Mover estes ficheiros para uma pasta `docs/dev-scripts/` ou removê-los do repositório principal se já não forem necessários, para evitar confusão sobre a sua função na arquitetura.

### 1.2. Supabase SQL Schema (`src/supabase-schema.sql`)
O ficheiro de esquema SQL reside dentro da pasta `src/`, que tipicamente deve conter apenas o código do *frontend*.
**Ação Sugerida:** Movê-lo para a raiz do projeto (ex: `/db/schema.sql`) ou para uma pasta `/docs/`, separando claramente o código da interface das definições da infraestrutura de base de dados.

---

## 2. Sugestões de Melhoria e Arquitetura (Próximos Passos)

À medida que o projeto ganha dimensão, algumas partes do código começam a revelar sinais de complexidade (conhecido como *code smell* de ficheiros monolíticos). Sugerem-se as seguintes refatorações para garantir a escalabilidade do sistema:

### 2.1. Divisão do Monólito `api.ts`
O ficheiro `src/services/api.ts` atingiu mais de 800 linhas e agrega múltiplas responsabilidades (Projetos, Tarefas, Ordens de Fabrico, Gestão de Utilizadores, Auto-Archive e pesquisas complexas).
*   **Melhoria:** Dividir este ficheiro em serviços específicos por domínio.
    *   `projectService.ts` (operações CRUD de obras)
    *   `ofService.ts` (Ordens de Fabrico e Tarefas)
    *   `userService.ts` (Roles e gestão de equipa)

### 2.2. Decomposição de Views (`OfView` e `ProjectView`)
Os ficheiros `OfView.tsx` e `ProjectView.tsx` ultrapassam as 500 linhas, contendo não só o desenho da UI (JSX), mas também muita lógica de negócio (drag-and-drop, exportação Excel/JSON, gestão de modais, formatação de prazos).
*   **Melhoria:** Extrair a lógica pesada para *Custom Hooks* (ex: `useProjectViewData()`, `useOfDragAndDrop()`). Separar as secções da UI em sub-componentes (ex: `<OfHeader />`, `<TaskList />`, `<ProjectMetrics />`), à semelhança do que foi feito com sucesso na `Sidebar`.

### 2.3. Code-Splitting das Rotas
Atualmente, o ficheiro `App.tsx` importa estaticamente todos os "ecrãs" da aplicação (`GlobalDashboard`, `ProjectView`, `OfView`, `UserManagement`), o que obriga o navegador a carregar o código inteiro (bundle de ~1.4MB) no arranque.
*   **Melhoria:** Utilizar `React.lazy()` e `<Suspense>` para carregar estes componentes maiores apenas quando o utilizador navega para eles. Isto reduzirá o tempo inicial de "Tauri splash screen" para milissegundos.

### 2.4. Resiliência do Cache Offline
O ficheiro `offlineCache.ts` guarda todo o estado (projetos, OFs e tarefas) no disco (`nexar-cache.json`). Se a base de dados crescer muito, carregar o JSON inteiro para a memória em cada arranque pode tornar-se lento em máquinas menos potentes.
*   **Melhoria a longo prazo:** Migrar de uma solução baseada num único ficheiro de texto (JSON) para uma base de dados local real e estruturada (ex: `IndexedDB` via *Dexie.js* ou SQLite em Rust do lado do Tauri), que permite ler partes específicas dos dados sem carregar tudo para a RAM.

---

## 3. Conclusão

A aplicação **work-manager** encontra-se na sua fase mais polida, estável e responsiva. O foco em funcionalidades "instantâneas" (através do Zustand) proporcionou uma excelente experiência de utilizador.

As recomendações listadas neste relatório não são urgentes nem afetam a experiência atual; são, sim, um guia de "boas práticas" de engenharia de software para garantir que o projeto se mantém rápido, fácil de testar e fácil de gerir à medida que a fábrica escala e novas funcionalidades são encomendadas.
