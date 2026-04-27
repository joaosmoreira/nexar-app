<div align="center">
  <h1>Nexar HUB</h1>
  <p><strong>Industrial Work Manager de Alta Performance</strong></p>
  
  <p>
    <a href="#"><img alt="Versão" src="https://img.shields.io/badge/Versão-v1.2.1-1E293B?style=for-the-badge&logoColor=white"/></a>
    <a href="#"><img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white"/></a>
    <a href="#"><img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white"/></a>
    <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/></a>
    <a href="#"><img alt="Offline-First" src="https://img.shields.io/badge/Offline--First-✓-10B981?style=for-the-badge"/></a>
  </p>
</div>

<br />

## 🌟 Visão Global

O **Nexar HUB** é uma aplicação desktop nativa concebida para revolucionar a forma como o chão de fábrica e os gabinetes de engenharia comunicam. Substituto direto das antiquadas folhas de cálculo, atua como o sistema central de rastreio de Obras, Ordens de Fabrico (OFs) e Tarefas de produção.

A aplicação brilha pelo seu motor **Offline-First**, que garante que, num ambiente de fábrica onde o sinal Wi-Fi pode falhar, nenhum dado se perde. O sistema arquiva localmente as ações de gestão de tarefas e sincroniza-as em *background* de forma silenciosa mal retoma a ligação aos servidores.

---

## ✨ Funcionalidades Core

### 📴 Motor Offline-First e Sincronização Inteligente
- **Fila de Mutações (Queue):** Cada interação (criar projeto, concluir tarefa, reordenar prioridades) é guardada localmente se a internet falhar.
- **Background Sync:** O sistema detecta automaticamente a retoma da rede (`window.online`) e injeta os pacotes de dados pendentes no Supabase.

### 🏭 Gestão Industrial: Obras, OFs e Tarefas
- **Dashboard Global:** Painel em tempo real com métricas da fábrica (OFs pendentes, projetos atrasados, taxa de conclusão).
- **Hierarquia de Dados:** Estrutura "Projeto > Ordens de Fabrico > Tarefas".
- **Drag & Drop Produtivo:** Utilização do `@dnd-kit` para reorganizar rapidamente as prioridades das tarefas numa OF.

### 👥 Controlo de Administração e Impersonação
- **Autenticação Segura:** Login centralizado via Supabase Auth.
- **RBAC (Role-Based Access Control):** Contas de Administrador têm poderes absolutos para gerir contas, enquanto os Utilizadores gerem as suas tarefas.
- **Modo "View As":** Administradores podem entrar diretamente na visão de um funcionário para lhe gerir a carga de trabalho sem necessidade de trocar credenciais.

### 📊 Relatórios e Analítica
- **Geração de Excel:** Criação instantânea de folhas Excel formatadas e estilizadas para reportar a atividade diária e estados dos projetos de engenharia.
- **Integração BIM:** Campos específicos para injetar links rápidos para pastas na nuvem (SharePoint) ou modelos BIM.

### ⚡ Navegação e UI/UX
- **Comando de Pesquisa Global (CMD+K):** Acesso ultrarrápido a qualquer projeto ou OF em 1 segundo.
- **UI de Alta Densidade:** Construída com Tailwind CSS para garantir que a máxima informação está visível sem criar ruído visual.

---

## 🛠️ Stack Tecnológico Detalhado

O Nexar HUB é construído num stack hiper-otimizado para garantir que se sente "leve como uma pluma, forte como o aço":

- **Core Desktop:** `Tauri v2` (escrito em Rust) para criar binários ultraleves.
- **Framework UI:** `React 19` com code-splitting (`React.lazy`).
- **Linguagem:** `TypeScript 5.8` para rigor absoluto de tipagem.
- **Estado Global:** `Zustand v5` com módulo de persistência local para cache instantânea.
- **Base de Dados:** `Supabase` (PostgreSQL) com RLS (*Row Level Security*).
- **Estilos:** `Tailwind CSS v4`.
- **Drag & Drop:** `@dnd-kit/core`.

---

## ⚙️ Para Developers

### 1. Documentação (Javadocs)
Toda a documentação técnica dos serviços, _hooks_ e interfaces foi extraída com o **TypeDoc**.  
Para ler o manual de código interativo:
```bash
npm run serve-docs
```

### 2. Arranque Local
O ambiente necessita de **Node.js 22+** e **Rust** (`rustup`).
```bash
npm install
npm run tauri dev
```

### 3. Build (Compilação Nativa)
Para gerar o executável final `.exe` ou `.dmg`:
```bash
npm run tauri build
```

---
<div align="center">
  <p>Construído para a <strong>excelência industrial</strong> e produtividade sem limites.</p>
</div>
