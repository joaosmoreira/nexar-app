<div align="center">
  <img src="https://img.icons8.com/?size=150&id=DREntqjQoW5N&format=png&color=000000" alt="Nexar Logo" width="80" />
  <h1>Nexar HUB</h1>
  <p><strong>Industrial Work Manager de Alta Performance</strong></p>
  <p>
    <img alt="Versão" src="https://img.shields.io/badge/Versão-v1.1.0-blue?style=flat-square"/>
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white"/>
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white"/>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
    <img alt="Offline" src="https://img.shields.io/badge/Offline--First-✓-10B981?style=flat-square"/>
  </p>
</div>

---

## 📌 Visão Geral

O **Nexar HUB** é uma solução desktop nativa (Windows & macOS) desenvolvida para a gestão e monitorização de fluxos de trabalho industriais. Projetada para substituir a fragmentação de ficheiros Excel, a aplicação oferece um ambiente centralizado, seguro e **offline-first** para o controlo total da produção.

A versão **v1.1.0** marca um salto qualitativo na maturidade do projeto, introduzindo uma arquitetura modular, navegação instantânea e otimizações de performance de alto nível.

---

## 🏗️ Arquitetura do Sistema

A aplicação utiliza uma estrutura modular para garantir escalabilidade e separação de responsabilidades. Abaixo encontra-se o mapa de componentes e fluxo de dados:

```mermaid
graph TD
    subgraph "Camada de Interface (React 19)"
        App[App.tsx] --> Sidebar[Sidebar Modular]
        App --> Views[Vistas Carregadas via Lazy]
        Sidebar --> Hooks[Hooks Customizados]
        Views --> Hooks
    end

    subgraph "Camada de Estado (Zustand)"
        Hooks --> Store[Global Cache Store]
    end

    subgraph "Camada de Serviços (API Modular)"
        Hooks --> API[Fachada Unificada]
        API --> PS[Project Service]
        API --> OS[OF Service]
        API --> TS[Task Service]
        API --> US[User Service]
    end

    subgraph "Infraestrutura"
        PS & OS & TS & US --> Supabase[(Supabase DB)]
        PS & OS & TS & US --> Cache[Offline Engine]
        Cache --> FS[Tauri File System]
    end
```

---

## 🚀 Funcionalidades Principais (v1.1.0)

### ⚡ Navegação Instantânea
- **Cache Global Inteligente**: Obras e Ordens de Fabrico são pré-carregadas no store global, eliminando ecrãs de "Loading" durante a navegação.
- **Code-Splitting**: Utilização de `React.lazy` para carregar módulos apenas quando necessários, acelerando o arranque inicial.

### 📴 Robustez Offline-First
- **Full Sync**: Funcionamento 100% autónomo sem internet com sincronização automática via fila de mutações.
- **Persistência Local**: Cache de dados em JSON nativo para acesso imediato ao histórico.

### 🔐 Segurança e RBAC
- **Controlo de Acessos**: Diferenciação entre perfis Admin e User com Row Level Security (RLS).
- **Proteção de Credenciais**: Fluxo de alteração de palavra-passe com validação obrigatória da credencial atual.

### 📊 Monitorização Industrial
- **Dashboard em Tempo Real**: Ponto de situação global com alertas visuais de prazos e inatividade.
- **Auto-Arquivo**: Gestão automática de portfólio para obras concluídas.
- **Exportação Profissional**: Gerador de relatórios Excel estilizados e backups em JSON.

---

## 💻 Stack Técnico

- **Runtime**: [Tauri v2](https://tauri.app/) (Rust Core)
- **Frontend**: React 19 + TypeScript 5.8
- **Estilos**: Tailwind CSS v4 (com animações de fluidez)
- **Estado**: Zustand v5 (com persistência de cache)
- **Backend/Auth**: Supabase (PostgreSQL)
- **Ordenação**: `@dnd-kit` para Drag & Drop industrial.

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
A aplicação dispõe de suporte nativo para arquitetura Apple Silicon. Devido às políticas de segurança da Apple:
- Após instalar, se for bloqueado pelo Gatekeeper, aceda a **Definições do Sistema > Privacidade e Segurança** e clique em **"Abrir Mesmo Assim"**.

---
<div align="center">
  <p>Desenvolvido para excelência industrial e produtividade máxima.</p>
</div>
