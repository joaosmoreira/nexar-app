# 🗺️ Plano de Reorganização e Estratégia de Git (v1.2.0+)

Este documento serve como guia para a futura limpeza técnica do projeto, garantindo que novos colaboradores possam trabalhar de forma isolada e organizada.

## 🏗️ 1. Reorganização de Pastas (Refatoração)
Atualmente, o projeto usa uma estrutura baseada em **Camadas (Layers)**. No futuro, migraremos para uma estrutura baseada em **Funcionalidades (Features)** para melhor isolamento.

### Estrutura Proposta:
```text
src/
  ├── features/
  │   ├── admin/           # Gestão de equipa e Impersonação
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   └── services/
  │   ├── projects/        # Gestão de Obras e OFs
  │   │   ├── components/
  │   │   └── services/
  │   └── shared/          # UI comum (Botões, Modais genéricos)
  ├── store/               # Estados Globais (Zustand)
  └── core/                # Configurações de API e Offline engine
```

## 🌿 2. Estratégia de Branches (Git Flow)
Para evitar que uma branch de "Dev" contenha múltiplas funcionalidades misturadas, seguiremos esta regra:

| Tipo | Prefixo | Exemplo | Descrição |
| :--- | :--- | :--- | :--- |
| **Funcionalidade** | `feat/` | `feat/admin-logs` | Novas ferramentas ou botões. |
| **Correção** | `fix/` | `fix/export-crash` | Resolução de bugs. |
| **Estilo** | `style/` | `style/sidebar-colors` | Mudanças puramente visuais (CSS/Tailwind). |
| **Manutenção** | `chore/` | `chore/update-deps` | Scripts, SQL, dependências. |

## 📝 3. Regras de Ouro para Colaboradores
1.  **Isolamento**: Nunca mexer na pasta de uma funcionalidade que não te pertence sem avisar o "Owner".
2.  **Branches Pequenas**: Uma branch por tarefa. Se a tarefa demora mais de 3 dias, deve ser dividida.
3.  **Merge via PR**: Ninguém escreve diretamente na `main`. Todas as alterações passam por revisão.

## 🗓️ To-Do para a Fase de Reorganização:
- [ ] Criar pasta `src/features`.
- [ ] Mover lógica de Impersonação para `features/admin`.
- [ ] Mover lógica de Obras/OFs para `features/projects`.
- [ ] Criar ficheiro `CONTRIBUTING.md` na raiz com base nestas notas.

---
*Nota: Este plano foi traçado para resolver a "mistura" de commits ocorrida na versão 1.2.0.*
