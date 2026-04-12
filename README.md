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
- **Tarefas de Trabalho** — Os passos de produção de cada O.F., totalmente reordenáveis (Drag & Drop)

Os dados são sincronizados em tempo real com a cloud via **Supabase (PostgreSQL)** quando há internet, e gravados localmente em cache quando offline.

---

## 🚀 Funcionalidades Principais

### 🔐 Autenticação Multi-Utilizador
- Login seguro com email + password via **Supabase Auth**
- Cada utilizador vê **apenas os seus próprios dados** — os projetos de um utilizador são completamente invisíveis para outro
- Isolamento garantido por **Row Level Security (RLS)** ao nível da base de dados

### 📴 Modo Offline-First
- A app funciona **completamente sem internet**
- Quando online: dados carregados do Supabase e guardados em cache local (`nexar-cache.json`) na pasta AppData do sistema
- Quando offline: dados servidos do cache local — leitura e escrita funcionam normalmente
- Escritas offline ficam em fila (`nexar-pending.json`) e são **sincronizadas automaticamente** ao voltar online
- IDs temporários (negativos) são resolvidos para IDs reais do Supabase durante o flush

### 📝 Ecossistema de Notas e Produtividade (Novo)
- **Informações Gerais da Obra**: Bloco de anotações persistente e partilhado no sumário visual de cada projeto.
- **Micro-Dossiê por OF**: Cada Ordem de Fabrico dispõe do seu próprio painel reservado de observações, que é lido também da página mãe para facilidade visual!
- **Edição Inline**: Títulos das OFs e nomenclatura das tarefas podem ser ajustados ou apagados com um simples clique.
- **Drag & Drop**: As tarefas da OF podem ser arrastadas e reordenadas manualmente sem perder sincronização ao base de dados.

### 🧩 Dashboard Global
- Mosaico interativo de relance com todas as Obras
- Progresso calculado em tempo real (% de tarefas concluídas)
- Alertas visuais de atraso para priorização: ⚠️ âmbar (>14 dias) e 🔴 vermelho (>21 dias) inativas

### ⏱️ Motor de Auto-Arquivo
- Varredura silenciosa: se um Projeto cumpre todos os requisitos a 100% e não tem cliques há mais de **7 dias**, é arquivado debaixo do teu radar.

### 🔍 Pesquisa Global (CMD + K)
- Paleta global em fullscreen com indexação nativa
- Pesquisa por strings híbridas de clientes, referência do projeto e número de O.F.

### 📂 Exportador Dual-Engine Nativo
- Processador de download direto de arrays para **`.xlsx`** (Excel) ou backup estrutural em **`.json`**.
- Dialogs controlados pelo sistema operativo via `@tauri-apps/plugin-dialog`
- Sistema estrito de FileSystem nativo resolvido e enquadrado com o motor de `ACL Rights` do ambiente restrito Apple!

---

## 🏗️ Historial de Desenvolvimento

| Fase | Foco | Destaques Técnicos |
|:---|:---|:---|
| **Fase 1 — Fundação** | Backend + UI base | Setup Tauri v2 + React + Vite; ligação Supabase; Sidebar estática |
| **Fase 2 — Navegação** | Views dinâmicas | `ProjectView` e `OfView`; roteamento por Zustand state |
| **Fase 3 — Analytics** | Dashboard + Alertas | Mosaicos de métricas; Alertas de atraso; `runAutoArchive` |
| **Fase 4 — UX Premium** | Search + Export | `CMD+K`; exportação com dialogs nativas Desktop |
| **Fase 5 — Auth** | Isolamento de dados | Supabase Auth; RLS global; login e dados confinados por user |
| **Fase 6 — Offline** | Cache + Sync | Leitura/Escrita offline nativa via JSON; Fila Sync e Temp IDs |
| **Fase 7 — Produtividade**| Drag&Drop | Notas transversais (Obra vs OFs); DND-Kit de Tarefas; Fixes ACL Desktop |

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
| **Offline Cache** | `@tauri-apps` FS Plugin | v2 |
| **Ícones** | Lucide React | v1 |
| **Excel Export** | SheetJS (xlsx) | v0.18 |
| **Drag & Drop** | `@dnd-kit` | v6 |

---

## 🗄️ Base de Dados (Supabase)

A estrutura completa está formatada dentro do `src/supabase-schema.sql`. O script foi otimizado para a Versão 2.1 e desenolvido de forma **Não-Destrutiva**.

### Tabelas Estruturais

```
projectos
├── id                 bigint PK (auto)
├── user_id            uuid FK → auth.users
├── nome               text
├── cliente            text
├── arquivado          boolean
├── informacoes_gerais text       [Bloco amplo de notas da obra]
├── ultimo_movimento   timestamp
└── criado_em          timestamp

ordens_fabrico
├── id          bigint PK
├── user_id     uuid FK → auth.users
├── projeto_id  bigint FK → projectos(id)
├── nome_of     text
├── numero_of   text
├── notas       text       [Anotações técnicas exclusivas]
├── status      text       'pendente' | 'em_progresso' | 'concluido'
└── criado_em   timestamp

tarefas
├── id          bigint PK
├── user_id     uuid FK → auth.users
├── ordem_id    bigint FK → ordens_fabrico(id)
├── nome_tarefa text
├── concluido   boolean
└── ordem_index int8       [Gere a posição orgânica na vista e Drag Drop]
```

### Isolamento de Dados (RLS)

Cada tabela está trancada por uma muralha de acesso através desta política:
```sql
USING (auth.uid() = user_id)
```
Isto assegura que **um utilizador nunca acede a Obras ou Tarefas de outro colega**, mesmo que ambos acedam ao HUB pela mesma instância global de Supabase.

---

## ⚙️ Setup e Construção

### Pré-requisitos

- Node.js ≥ 20
- Rust + Cargo (via [rustup](https://rustup.rs))
- Tauri CLI v2

### Instalação

```bash
# 1. Clonar O Repositório
git clone <repo-url>
cd work-manager

# 2. Instalar dependências pesadas
npm install

# 3. Criar a raiz de ambiente e ligar o Backend
cp .env.example .env
# Adicionar: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

### Comandos de Suporte

```bash
# Correr o emulador interativo Browser/Tauri Window:
npm run tauri dev

# Exigir ao Desktop que coza a aplicação (.App, .Dmg, .Exe):
npm run tauri build
```

---

## 🍎 Instalação no macOS (App distribuída)

> [!IMPORTANT]
> O executável gerado é assinado internamente de forma **ad-hoc** (não dispõe de Certificados Públicos Autorizados pela Mação). Significa que a app será apanhada pelas firewalls do Gatekeeper no primeiro e único arranque livre.

### Método 1 — System Settings (Recomendado)

1. Abrir o pacote instalador do `.dmg`.
2. Arrastar o logótipo amarelo `Nexar HUB` para os teus atalhos / pasta `Aplicações`.
3. Clica para abrir → Vai saltar o protesto da macã "Não Autorizado!". Clica OK/Fechar.
4. Entra em **Definições do Sistema → Privacidade e Segurança**.
5. Faz scrool até meio e diz ao sistema: **"Nexar HUB foi bloqueada mas confio! → Abrir Mesmo Assim"** 

### Método 2 — Desbloqueio via Terminal

Limpa a restrição diretamente no diretório das Aplicações:

```bash
xattr -rd com.apple.quarantine "/Applications/Nexar HUB.app"
```

## 🔒 Segurança de Rede

> **NUNCA partilhe de que forma for as linhas de acesso que estão escondidas no vosso `.env`. O mural de segurança RLS defende-vos totalmente num browser standard, mas é possível extrair informações se a base de dados for encurralada remotamente**

## 🌿 Flow de Versionamento

| Branch | Propósito Global |
|:---|:---|
| `main` | Produção Core Estável (V2.1 - Master Version com Exportação e Sistema de Notas e Offline Ativo) |
