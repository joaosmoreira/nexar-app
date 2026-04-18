#!/bin/bash
# ══════════════════════════════════════════════════════
#  Nexar HUB — Instalador macOS
#  Duplo-clique para instalar automaticamente.
# ══════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$SCRIPT_DIR/nexar-app.app"
INSTALL_PATH="/Applications/nexar-app.app"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Nexar HUB — Instalador"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se a app existe no mesmo diretório
if [ ! -d "$APP_PATH" ]; then
  echo "❌ Erro: nexar-app.app não encontrada nesta pasta."
  echo "   Certifica-te que o script está na mesma pasta que nexar-app.app"
  read -p "Prima Enter para fechar..."
  exit 1
fi

echo ""
echo "→ A remover restrições de segurança do macOS..."
xattr -cr "$APP_PATH"

echo "→ A copiar para /Applications..."
cp -R "$APP_PATH" "$INSTALL_PATH"

echo "→ A remover restrições da app instalada..."
xattr -cr "$INSTALL_PATH"

echo ""
echo "✅ Nexar HUB instalado com sucesso!"
echo "   Podes encontrá-la em /Applications ou no Launchpad."
echo ""

read -p "Abrir a app agora? (s/n): " resposta
if [[ "$resposta" == "s" || "$resposta" == "S" ]]; then
  open "$INSTALL_PATH"
fi
