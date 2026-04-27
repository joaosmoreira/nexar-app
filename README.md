# Nexar HUB

Gestor de projetos e ordens de fabrico (OF) desenvolvido em Tauri e React, com foco em performance e funcionamento offline-first.

## 🏗️ Arquitetura Técnica Detalhada (UML)

```mermaid
classDiagram
    class AppStore {
        +User user
        +UserRole userRole
        +boolean isOnline
        +boolean isSyncing
        +Projeto[] projects
        +OrdemFabrico[] ofs
        +number selectedProjectId
        +number selectedOfId
        +string viewingUserId
        +setUser(user, session)
        +setSelectedProject(id)
        +setSelectedOf(id)
        +setViewingUser(id, name)
        +addOfs(newOfs)
    }

    class UnifiedApiFacade {
        <<Facade>>
        +fetchProjetos()
        +fetchOfsByProjeto(projId)
        +createProjeto(data)
        +updateTarefa(id, data)
        +toggleTarefaConcluida(id)
        +syncPending()
    }

    class DomainServices {
        <<Internal Services>>
        +ProjectService
        +OfService
        +TaskService
        +MetricsService
        +UserService
    }

    class OfflineEngine {
        +MutationQueue queue
        +LocalStorage cache
        +readCache(key)
        +writeCache(key, data)
        +queueMutation(action, payload)
        +flushPendingMutations()
    }

    class SupabaseRemote {
        <<Remote DB>>
        +PostgreSQL
        +RowLevelSecurity (RLS)
        +Auth Service
    }

    AppStore ..> UnifiedApiFacade : UI Actions
    UnifiedApiFacade --> DomainServices : Business Logic
    UnifiedApiFacade --> OfflineEngine : Cache Management
    DomainServices ..> SupabaseRemote : Remote Requests
    OfflineEngine ..> SupabaseRemote : Data Synchronization
```

## 🛠️ Stack Tecnológica

- **Frontend:** React 19, TypeScript 5.8, Tailwind CSS v4
- **Estado:** Zustand v5 (com persistência local)
- **Backend:** Supabase (Auth, DB, RLS)
- **Desktop:** Tauri v2 (Rust)
- **Exportação:** XLSX (Excel)

## ✨ Funcionalidades

- **Gestão Hierárquica:** Organização por Projetos, Ordens de Fabrico e Tarefas.
- **Offline-First:** Sincronização automática de dados após retoma de ligação à internet.
- **Administração:** Controlo de utilizadores e modo de visualização de dashboard individual.
- **Pesquisa Rápida:** Atalho `CMD + K` para acesso imediato a qualquer registo.
- **Exportação:** Geração de relatórios Excel formatados.

## ⚙️ Desenvolvimento

### Documentação Técnica
Para gerar a documentação das interfaces e serviços (via TypeDoc):
```bash
npm run docs
npm run serve-docs
```

### Instalação
```bash
npm install
npm run tauri dev
```

### Build
```bash
npm run tauri build
```
