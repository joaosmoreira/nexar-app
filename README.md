<div align="center">
  <img src="https://img.icons8.com/?size=150&id=DREntqjQoW5N&format=png&color=000000" alt="Nexar Logo" width="80" />
  <h1>Nexar HUB</h1>
  <p><strong>Industrial Work Manager de Alta Performance</strong></p>
</div>

---

## 📌 Resumo da Aplicação

O **Nexar HUB** é uma aplicação híbrida de gestão industrial construída como aplicação de *Desktop* nativa macOS / Windows utilizando o poderoso motor **Tauri v2**.
O sistema foi concebido para abolir o uso de folhas de Excel soltas nas fábricas. Proporciona um ambiente imaculado, sombrio (Dark Mode orgânico) e ultrarrápido para que os diretores de produção consigam monitorizar **Obras (Projetos Mestre)**, as respetivas **Ordens de Fabrico (O.F.s)** e cada um dos seus **Passos (Tarefas de Trabalho)** em tempo real.

O projeto assenta numa base de dados Cloud em **Supabase (PostgreSQL)**, permitindo aceder globalmente aos dados em segurança, enquanto mantém a fluidez visual imediata que se exigiria de um programa instalado localmente (*Offline-feel*).

---

## 🚀 Funcionalidades Chave (Core Features)

- **🧩 Monitorização Global (Dashboard)**: O ecrã de entrada converte todas as métricas abertas num mosaico fluído de dados para percepção visual imediata, colocando para segundo as obras seladas ou passadas.
- **🛡️ UX "Erro-Blindada"**: Utilização de Modais Interativos anti-erro humano. Ao invés do `alert` barato do browser nativo, a aplicação requer a digitação literal do número da obra para confirmar destruições, garantindo segurança na pressa logística industrial.
- **⏱️ Motor de Auto-Arquivo Fantasma**: Varredura silenciosa (`auto-archival logic`). Se um Projeto detiver todas as suas O.F.s marcadas a 100% verde sem novidades por **7 dias seguidos**, ele desliza para o Lixo Histórico (Arquivo) sozinho, sem chatear o coordenador.
- **🔍 Pesquisa "Command Palette" (CMD + K)**: Busca universal focada em produtividade. O ecrã escurece revelando apenas a linha logitudinal, pronta para sondar tanto Nomes de Clientes como Códigos de Ordens de Fabrico nas centenas de caixas disponíveis, saltando logo em fração de segundo.
- **🗃️ Exportador "Dual-Engine" Automático**: Quando a aplicação nativa necessita de partilhar o processo com clientes externos ou engenheiros, dispõe da inteligência de gravar nativamente ficheiros compatíveis com Microsoft® Excel `.xlsx` ou Backup de sistema em `.json` perfeitamente estruturado, saltando as bolhas de segurança do ambiente Apple ou Windows utilizando o motor Fs do Rust.

---

## 🏗️ Fases de Desenvolvimento e Etapas de Produção

Toda a arquitetura progrediu em escadas sólidas para evitar retrocessos e código residual ao longo dos ciclos. A tabela a seguir representa o plano percorrido para estabilizar o código à data atual:

| Fase de Produção | Foco Arquitetural | Pontos Chaves & Definições Técnicas Implementadas |
| :---------- | :--- | :--- |
| **Fase 1: Fundação Backend** | Lógica de Ligações API & UI Esqueleto | • Setup inicial com `Tauri v2`, `React` + `Vite`<br>• Ligação estrutural ao Sistema SQL Global por chaves e políticas PKS<br>• Criação Base da *Sidebar* estática para visualização contínua. |
| **Fase 2: Gestão Visual de Ciclo** | Escalabilidade de Navegação | • Criação das páginas separadas de `ProjectView` (*Visão Abstrata da Obra*) e `OfView` (*Checklist de fábrica para chão de produção*)<br>• Componentes auto-reativos que mudam de status dependendo do % da totalidade completada. |
| **Fase 3: Analytics Inteligente** | Filtros e *Timeline* Sensorial | • Hub Global com "Cartões Mestre" das Obras.<br>• Alertas passivos integrados: Triângulos de Perigo coloridos caso o projeto arraste há mais de **2 ou 3 Semanas** nas docas da fábrica.<br>• Implementação pesada do script de Motor `runAutoArchive`. |
| **Fase 4: Premium Polishing UI/UX**| *Command Palette* e Segurança Nativa | • *Hover States*, Cores "céu e âmbar" com reatividade imediata e injeção forçada de `color-scheme: dark` no kernel macOS Tauri para Scrollbars orgânicas.<br>• Transformar *Prompts* de navegador em Dialogs de Mac nativo usando as livrarias de OS diretas no `exportUtils`.<br>• Janela Global Search à pressão duma telca invocando `ilike` na SQL BD. |

---

## 💻 Tech Stack Detalhado e Ferramentas

- **Frontend Core**: React 18 / TypeScript
- **Bundler & Build Tool**: Vite (Lightning Fast Hot Modules)
- **Engine Desktop**: Tauri v2 Framework (Cargo/Rust) + `Fs/Dialog Plugins`
- **Estilização Dinâmica**: Tailwind CSS (Abordagem Utility-First para responsividade modular)
- **Gestão de Estado**: Zustand (Store Global)
- **Sistema de Base de Dados**: Supabase SDK Cloud Architecture (C/ RLS rules baseadas em chaves locais).
- **Icons & Extras**: Lucide React / SheetJs (Para serialização de Buffer para Excel).

> **Nota de Segurança:** Por se tratar do ecossistema central de faturação e dados de fábrica, não expor sob pretexto nenhum o ficheiro `.env` associado às chaves anon da cloud de dados principal. As mesmas encontram-se isoladas com `gitignore` ativo.
