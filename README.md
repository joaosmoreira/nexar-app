<div align="center">
  <img src="https://img.icons8.com/?size=150&id=DREntqjQoW5N&format=png&color=000000" alt="Nexar Logo" width="80" />
  <h1>Nexar HUB</h1>
  <p><strong>Industrial Work Manager de Alta Performance</strong></p>
  <p>
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white"/>
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white"/>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white"/>
    <img alt="Offline" src="https://img.shields.io/badge/Offline--First-✓-10B981?style=flat-square"/>
  </p>
</div>

---

## 📌 O que é o Nexar HUB

O **Nexar HUB** é uma aplicação desktop nativa (macOS + Windows) de gestão industrial construída com **Tauri v2**. Foi concebida para substituir folhas de cálculo Excel dispersas nas fábricas, oferecendo um ambiente sombrio (Dark Mode), ultrarrápido e **offline-first** para monitorizar:

- **Obras / Projetos** — A entidade-mestre de cada encomenda de produção
- **Ordens de Fabrico (O.F.s)** — As fases de execução dentro de cada Obra
- **Tarefas de Trabalho** — Os 6 passos de produção de cada O.F. (Modelação → Montagem)

Os dados são sincronizados em tempo real com a cloud via **Supabase (PostgreSQL)** quando há internet, e gravados localmente em cache quando offline.

---

## 🚀 Funcionalidades Principais

### 🔐 Autenticação Multi-Utilizador
- Login seguro com email + password via **Supabase Auth**
- Cada utilizador vê **apenas os seus próprios dados** — os projetos de um utilizador são completamente invisíveis para outro
- Isolamento garantido por **Row Level Security (RLS)** ao nível da base de dados

### 📴 Modo Offline-First (novo)
- A app funciona **completamente sem internet**
- Quando online: dados carregados do Supabase e guardados em cache local (`nexar-cache.json`) na pasta AppData do sistema
- Quando offline: dados servidos do cache local — leitura e escrita funcionam normalmente
- Escritas offline ficam em fila (`nexar-pending.json`) e são **sincronizadas automaticamente** ao voltar online
- IDs temporários (negativos) são resolvidos para IDs reais do Supabase durante o flush
- Indicador visual na Sidebar: 🟢 Online / 🟡 A sincronizar / 🔴 Offline

### 🧩 Dashboard Global
- Mosaico de cartões com todas as Obras ativas
- Progresso calculado em tempo real (% de tarefas concluídas)
- Alertas visuais de atraso: ⚠️ âmbar (>14 dias) e 🔴 vermelho (>21 dias) sem movimento

### ⏱️ Motor de Auto-Arquivo
- Varredura silenciosa: se um Projeto tem **todas as tarefas a 100%** e não tem atividade há **7 dias**, é arquivado automaticamente
- Só corre quando online (lógica de escrita no Supabase)

### 🔍 Pesquisa Global (CMD + K)
- Command Palette em fullscreen com pesquisa em tempo real
- Pesquisa por nome de cliente, referência de projeto e número de O.F.
- Funciona offline (pesquisa no cache local)

### 📂 Exportador Dual-Engine
- Exporta dados para **`.xlsx`** (Excel) ou **`.json`** (backup estruturado)
- Dialogs nativos do sistema operativo via `@tauri-apps/plugin-dialog`
- Escrita de ficheiro via `@tauri-apps/plugin-fs` sem restrições de sandbox

---

## 🏗️ Historial de Desenvolvimento

| Fase | Foco | Destaques Técnicos |
|:---|:---|:---|
| **Fase 1 — Fundação** | Backend + UI base | Setup Tauri v2 + React + Vite; ligação Supabase; Sidebar estática |
| **Fase 2 — Navegação** | Views dinâmicas | `ProjectView` (Obra) e `OfView` (Checklist de produção); roteamento por Zustand state |
| **Fase 3 — Analytics** | Dashboard + Alertas | GlobalDashboard com cartões de métricas; alertas de atraso; `runAutoArchive` |
| **Fase 4 — UI/UX Premium** | Command Palette + Export | `CMD+K` global search; exportação Excel/JSON com dialogs nativos; dark mode orgânico |
| **Fase 5 — Auth Multi-User** | Isolamento de dados | Supabase Auth; RLS em todas as tabelas; ecrã de login; dados por utilizador |
| **Fase 6 — Offline-First** | Cache + Sync | Cache JSON local; fila de mutações pendentes; flush automático; indicador de conectividade |

---

## 💻 Stack Técnico

| Camada | Tecnologia | Versão |
|:---|:---|:---|
| **Runtime Desktop** | Tauri (Rust) | v2 |
| **Frontend** | React + TypeScript | 19 / 5.8 |
| **Bundler** | Vite | v7 |
| **Estilos** | Tailwind CSS | v4 |
| **Estado Global** | Zustand | v5 |
| **Base de Dados** | Supabase (PostgreSQL + Auth) | SDK v2 |
| **Offline Cache** | `@tauri-apps/plugin-fs` | v2 |
| **Ícones** | Lucide React | v1 |
| **Excel Export** | SheetJS (xlsx) | v0.18 |

---

## 📁 Estrutura do Projeto

```
work-manager/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Ecrã de login (Supabase Auth)
│   │   ├── GlobalDashboard.tsx   # Dashboard principal com cartões
│   │   ├── GlobalSearchModal.tsx # Command Palette (CMD+K)
│   │   ├── Modal.tsx             # Modal reutilizável
│   │   ├── OfView.tsx            # Vista detalhada de uma O.F.
│   │   ├── ProjectView.tsx       # Vista de uma Obra (lista de OFs)
│   │   └── Sidebar.tsx           # Navegação lateral + indicador offline
│   ├── lib/
│   │   ├── exportUtils.ts        # Exportação Excel/JSON via Tauri FS
│   │   └── utils.ts              # Helpers (cn, etc.)
│   ├── services/
│   │   ├── api.ts                # CRUD completo (online + offline)
│   │   └── offlineCache.ts       # Cache local JSON + fila de mutações
│   ├── store/
│   │   └── useAppStore.ts        # Estado global Zustand
│   ├── supabase-schema.sql       # Schema completo da BD (único ficheiro)
│   ├── supabaseClient.ts         # Inicialização do cliente Supabase
│   ├── App.tsx                   # Root: auth, listeners online/offline
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   └── main.rs               # Entry point Rust
│   ├── capabilities/             # Permissões Tauri v2
│   ├── tauri.conf.json           # Configuração da app (janela, bundle)
│   └── Cargo.toml                # Dependências Rust
├── .env                          # Chaves Supabase (NÃO commitar)
├── .gitignore
└── package.json
```

---

## 🗄️ Base de Dados (Supabase)

O schema completo está em `src/supabase-schema.sql`. Para configurar uma nova instância:

1. Criar projeto no [Supabase](https://supabase.com)
2. Ir a **SQL Editor** e executar o conteúdo de `src/supabase-schema.sql`
3. Copiar as chaves `URL` e `anon key` do painel **Project Settings → API**

### Tabelas

```
projectos
├── id              bigint PK (auto)
├── user_id         uuid FK → auth.users  ← RLS: dono do registo
├── nome            text    ex: "GS1522 - Garsteel Escadas"
├── cliente         text    ex: "Garsteel"
├── arquivado       boolean false = ativo | true = arquivado
├── ultimo_movimento timestamp  atualizado em cada interação
└── criado_em       timestamp

ordens_fabrico
├── id          bigint PK
├── user_id     uuid FK → auth.users       ← RLS
├── projeto_id  bigint FK → projectos(id)  ON DELETE CASCADE
├── nome_of     text    ex: "Estrutura Principal"
├── numero_of   text    ex: "OF-2024-001"
├── status      text    'pendente' | 'em_progresso' | 'concluido'
└── criado_em   timestamp

tarefas  (6 criadas automaticamente por O.F.)
├── id          bigint PK
├── user_id     uuid FK → auth.users            ← RLS
├── ordem_id    bigint FK → ordens_fabrico(id)  ON DELETE CASCADE
├── nome_tarefa text    (ver ordem abaixo)
├── concluido   boolean
└── ordem_index int8    (0 a 5)
```

**Tarefas pré-definidas por O.F. (por ordem):**

| Index | Tarefa |
|:---:|:---|
| 0 | Modelação |
| 1 | Aprovisionamento Material |
| 2 | Validação |
| 3 | Fabrico |
| 4 | Parafusaria |
| 5 | Montagem |

### Isolamento de Dados (RLS)

Cada tabela tem Row Level Security ativado com a política:
```sql
USING (auth.uid() = user_id)
```
Isto garante que **um utilizador nunca acede a dados de outro**, mesmo que partilhem a mesma instância Supabase.

---

## 📴 Sistema Offline-First

### Como funciona

```
┌──────────╗     online?     ┌───────────────────────────────┐
│  React UI ║ ─────────────▶ │         api.ts                │
└──────────╝                 └─────────────┬─────────────────┘
                                           │
                         ┌─────────────────┴──────────────────┐
                         │ Sim                                 │ Não
                         ▼                                     ▼
                  Supabase (fetch/write)            offlineCache.ts
                         │                                     │
                         ▼                                     ▼
                  nexar-cache.json (save)         nexar-cache.json (read)
                                                  nexar-pending.json (queue)

Ao reconectar:
  flushPendingMutations() → executa fila → resolve temp IDs → sync cache
```

### Ficheiros de cache (AppData do sistema)

| Ficheiro | Conteúdo |
|:---|:---|
| `nexar-cache.json` | Snapshot completo dos dados (projetos, OFs, tarefas) |
| `nexar-pending.json` | Fila de mutações feitas offline (ordenada, com IDs temporários) |

**Localização:**
- macOS: `~/Library/Application Support/com.ctk.nexar/`
- Windows: `%APPDATA%\com.ctk.nexar\`

### IDs Temporários

Criações offline (Projeto ou O.F.) recebem IDs negativos temporários (ex: `-1`, `-2`). Ao sincronizar, o motor de flush resolve cada ID temporário para o ID real retornado pelo Supabase, atualizando as referências nas mutações subsequentes da fila.

---

## ⚙️ Setup e Desenvolvimento

### Pré-requisitos

- Node.js ≥ 20
- Rust + Cargo (via [rustup](https://rustup.rs))
- Tauri CLI v2

### Instalação

```bash
# 1. Clonar
git clone <repo-url>
cd work-manager

# 2. Instalar dependências
npm install

# 3. Criar ficheiro de ambiente
cp .env.example .env
# Preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

### Variáveis de Ambiente (`.env`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Comandos

```bash
# Desenvolvimento (hot-reload)
npm run tauri dev

# Build de produção
npm run tauri build

# Apenas frontend (sem Tauri)
npm run dev
```

---

## 🔒 Segurança

> **IMPORTANTE:** O ficheiro `.env` contém as chaves da cloud e está incluído no `.gitignore`. **Nunca commitar este ficheiro.** As chaves permitem acesso à base de dados de produção.

A segurança assenta em três camadas:
1. **Autenticação** — Supabase Auth com tokens JWT
2. **RLS** — Políticas ao nível da base de dados (não contornáveis pelo cliente)
3. **Tauri CSP** — Restrições de Content Security Policy na janela nativa

---

## 🌿 Branches

| Branch | Propósito |
|:---|:---|
| `main` | Produção estável |
| `feature/user-auth-and-data-isolation` | Branch de desenvolvimento atual |
