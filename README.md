<div align="center">
  <img src="https://img.icons8.com/?size=150&id=DREntqjQoW5N&format=png&color=000000" alt="Nexar Logo" width="100" />
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

## 🌟 O que é o Nexar HUB?

O **Nexar HUB** é uma solução desktop nativa (disponível para Windows & macOS) desenhada especificamente para a gestão e monitorização de fluxos de trabalho na indústria. Criada para substituir processos lentos baseados em folhas de cálculo e emails, a aplicação oferece um ambiente de trabalho centralizado, ultra-rápido e focado na produtividade.

Desenvolvido com uma arquitetura **Offline-First**, o Nexar HUB garante que as equipas no terreno ou em fábricas com acesso limitado à internet possam continuar a trabalhar sem qualquer interrupção, sincronizando todos os dados de forma transparente e segura em segundo plano.

<br />

## ✨ Funcionalidades em Destaque

- 🚀 **Navegação Instantânea:** Componentes otimizados e sistema de *caching global* que elimina ecrãs de loading para as transições entre projetos e tarefas.
- 📴 **Sincronização Offline-First:** Toda a aplicação funciona 100% de modo autónomo, gravando as ações localmente e sincronizando automaticamente assim que a ligação for restabelecida.
- 👥 **Gestão Avançada de Equipa:** Administração completa de papéis (Admin/User), com a possibilidade de "Impersonação" para verificar o dashboard individual de cada colaborador.
- 📁 **Cloud Connect:** Integração rápida com repositórios BIM e plataformas SharePoint ao nível da obra.
- 📊 **Exportação Excel Profissional:** Geração de relatórios com um clique, apresentando os dados com um layout rigoroso e formatação premium.
- 🔐 **Segurança e Controlo de Acesso:** Permissões blindadas, RLS na base de dados (Supabase) e auto-arquivo inteligente de obras concluídas.

<br />

## 🛠️ Stack Tecnológico

A aplicação foi desenhada com ferramentas de topo para garantir uma base sólida, expansível e hiper-rápida.

| Frontend | Backend & Infra | Desktop Engine |
| :--- | :--- | :--- |
| **React 19** | **Supabase** (PostgreSQL) | **Tauri v2** (Rust) |
| **TypeScript 5.8** | Row Level Security (RLS) | File System API nativa |
| **Tailwind CSS v4** | Auto-arquivamento Cloud | Notificações Desktop |
| **Zustand v5** | Autenticação Segura | Multi-Platform (Win/Mac) |

<br />

## 📚 Documentação (Javadocs)

A documentação completa do código fonte (interfaces, hooks, serviços e componentes) encontra-se disponível no formato web interativo (via TypeDoc).

Para aceder:
1. Abra o seu terminal.
2. Execute o comando local:
   ```bash
   npm run serve-docs
   ```
3. Aceda ao link disponibilizado no browser para navegar pelo mapa de funções da aplicação.

<br />

## ⚙️ Como Começar (Para Developers)

### 1. Pré-requisitos
Certifique-se que a sua máquina tem instalado:
- **Node.js** (v22 ou superior)
- **Rust** e o toolchain associado (via `rustup`)

### 2. Instalação e Desenvolvimento
Clone o repositório, instale as dependências e inicie o ambiente de desenvolvimento.
```bash
npm install
npm run tauri dev
```

### 3. Compilação para Produção
Gera os ficheiros instaláveis (`.exe` no Windows, `.dmg` / `.app` no macOS).
```bash
npm run tauri build
```

<br />

## 🍎 Notas Exclusivas macOS

Sendo uma aplicação nativa preparada para a arquitetura Apple Silicon, as políticas do sistema da Apple (*Gatekeeper*) poderão bloquear a primeira execução de aplicações não distribuídas pela App Store.
Se a aplicação não abrir, vá a **Definições do Sistema > Privacidade e Segurança** e clique em **"Abrir Mesmo Assim"** para adicionar a exceção.

<br />

---
<div align="center">
  <p>Construído para a <strong>excelência industrial</strong> e produtividade sem limites.</p>
</div>
