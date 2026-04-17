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

## 📌 Visão Geral

O **Nexar HUB** é uma solução desktop nativa (Windows & macOS) desenvolvida com **Tauri v2** para a gestão e monitorização de fluxos de trabalho industriais. Projetada para substituir a fragmentação de ficheiros Excel, a aplicação oferece um ambiente centralizado, seguro e **offline-first** para o controlo total da produção.

### Estrutura de Dados
- **Obras**: Projetos mestres que agrupam toda a produção de um cliente.
- **Ordens de Fabrico (O.F.s)**: Sub-entidades que representam fases ou lotes específicos de fabrico.
- **Tarefas**: Passos operacionais dentro de cada OF, com controlo de conclusão e ordenação.

---

## 🚀 Funcionalidades Atuais

### 🔐 Autenticação e Hierarquia (v2.0)
- **Segurança Nativa**: Login/Logout geridos via Supabase Auth.
- **Isolamento Total**: Dados confinados por utilizador através de Row Level Security (RLS).
- **Gestão de Equipa**: Interface administrativa para gestão de utilizadores e atribuição de cargos (Admin vs User).

### 📴 Arquitetura Offline-First
- **Full Sync**: A app funciona 100% sem internet, utilizando cache local em ficheiros JSON.
- **Mutation Queue**: Todas as ações realizadas offline são colocadas em fila e sincronizadas automaticamente ao detetar ligação.
- **Resolução de IDs**: Sistema inteligente que resolve IDs temporários (offline) para IDs reais de base de dados durante o sync.

### 📊 Dashboard e Monitorização
- **Visão Global**: Painel de mosaicos interativos com progresso real de todas as obras.
- **Alertas de Atraso**: Identificação visual automática de projetos inativos ou OFs com prazos críticos.
- **Auto-Arquivo**: Motor inteligente que arquiva obras concluídas e sem movimento após 7 dias.

### 🖱️ UX Premium e Organização (Novo)
- **Total Drag & Drop**: Ordenação manual de obras na sidebar e tarefas nas OFs com interface fluida.
- **Ordenação Inteligente**: Obras concluídas descem automaticamente para o fundo da lista, mantendo as obras ativas no topo.
- **Navegação Persistente**: Correção de fluxo de sessão que garante um arranque sempre limpo no dashboard.
- **Pesquisa Global (CMD+K)**: Paleta de comandos para localização instantânea de qualquer projeto ou OF.

### 📂 Exportação e Relatórios
- **Excel Profissional**: Exportação de relatórios de progresso com formatação corporativa, estilos aplicados e detalhe de tarefas.
- **JSON Backup**: Capacidade de extrair dados estruturados para backup ou análise externa.
- **Integração OS**: Botão "Abrir" direto no toast de sucesso para acesso imediato aos ficheiros exportados.

---

## 🏗️ Historial de Desenvolvimento

| Fase | Título | Descrição e Conquistas |
|:---|:---|:---|
| **P1** | **Foundations** | Criação do núcleo industrial: Projectos → OFs → Tarefas. Integração base Tauri + Supabase. |
| **P2** | **Analytics & Visuals** | Desenvolvimento do Dashboard Global e sistema de métricas de progresso em tempo real. |
| **P3** | **Security & Roles** | Implementação de Multi-User Auth e RLS. Adição do painel de Gestão de Equipa (Admin). |
| **P4** | **Offline Engine** | Construção do motor de sincronização local e fila de mutações para operação sem rede. |
| **P5** | **UX & Command** | Implementação da Pesquisa Global (CMD+K) e refinamento estético (Dark Mode premium). |
| **P6** | **Reporting** | Motor de exportação Excel de alta fidelidade e sistema de backup robusto. |
| **P7** | **Advanced DND** | Implementação de reordenação total, ordenação dinâmica por status e polimento de UI. |

---

## 💻 Stack Técnico

- **Runtime**: [Tauri v2](https://tauri.app/) (Rust Core)
- **Frontend**: React 19 + TypeScript 5.8
- **Estilos**: Tailwind CSS v4 + Lucide Icons
- **Estado**: Zustand v5
- **Backend/Auth**: Supabase (PostgreSQL + RLS)
- **Ordenação**: `@dnd-kit`
- **Excel**: `xlsx-js-style`

---

## ⚙️ Instalação e Build

### Requisitos
- Node.js ≥ 22
- Rust (via rustup)
- Tauri CLI v2

### Setup
```bash
npm install
npm run tauri dev
```

### Build para Produção
```bash
npm run tauri build
```

---

## 🍎 Notas macOS
A aplicação dispõe de suporte nativo para arquitetura Apple Silicon (ARM64). Devido a restrições do Gatekeeper:
- Após instalar na pasta `Aplicações`, abrir as **Definições do Sistema > Privacidade e Segurança**.
- Clique em **"Abrir Mesmo Assim"** após o primeiro bloqueio do sistema.

---
<div align="center">
  <p>Desenvolvido para excelência industrial e produtividade.</p>
</div>
