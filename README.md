# Nexar HUB

Gestor de projetos e ordens de fabrico (OF) desenvolvido em Tauri e React, com foco em performance e funcionamento offline-first.

## 🏗️ Arquitetura do Sistema

```mermaid
graph TD
    classDef frontend fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff
    classDef state fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef api fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef infra fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#94a3b8

    subgraph UI ["Interface (React)"]
        A[App] --> B[Sidebar]
        A --> C[Project/Of Views]
    end

    subgraph Logic ["Orquestração"]
        D[Zustand Store] -- Sync --> UI
        E[API Facade] -- Sync Logic --> D
    end

    subgraph Persistence ["Dados"]
        E -- Online --> F[(Supabase)]
        E -- Offline --> G[Cache Local]
    end

    class A,B,C frontend
    class D state
    class E api
    class F,G infra
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
