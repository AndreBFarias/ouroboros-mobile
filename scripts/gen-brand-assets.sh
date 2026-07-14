#!/usr/bin/env bash
# Gera os assets de marca (icone / splash / favicon / notification /
# lockup) a partir do SVG canonico ouroboros.svg. Fonte-de-verdade unica
# da marca: o mesmo glifo alimenta o icone do launcher, o splash e o
# componente in-app src/components/brand/OuroborosLogo.tsx.
#
# Substitui o gerador procedural antigo (scripts/gerar-assets-marca.py,
# que desenhava o glifo antigo de arcos e usava bg #282a36). Aqui o bg
# canonico e' #14151a (identico em splash + adaptiveIcon, sem salto no
# boot) e o glifo sao as 43 contas + cabeca do ouroboros.svg.
#
# A fonte SVG fica FORA do repo (read-only). Caminho default abaixo,
# sobrescrivivel por argumento ou variavel de ambiente:
#   OURO_SVG=/caminho/ouroboros.svg ./scripts/gen-brand-assets.sh
#   ./scripts/gen-brand-assets.sh /caminho/ouroboros.svg
#
# Requisitos: rsvg-convert (librsvg) + ImageMagick (convert).
# Idempotente: sobrescreve os PNGs em assets/.
#
# Valores canonicos fixados pela spec R-BRAND-1-LOGO (§9):
#   backgroundColor = #14151a   (icon / splash / adaptiveIcon)
#   safe-zone do adaptive = glifo em ~62% do canvas (Android mascara
#     ~66% central; o anel das contas encosta na borda do viewBox).
# Anonimato (Regra -1): -strip remove qualquer metadata de autor/host.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

OURO_SVG="${1:-${OURO_SVG:-$HOME/Desktop/assets-ouroboros-loading-logo/ouroboros.svg}}"
ASSETS="assets"
BRAND="$ASSETS/brand"
BG="#14151a"
SAFE_PCT="62%"   # glifo dentro da safe-zone do adaptive icon

if [[ ! -f "$OURO_SVG" ]]; then
  echo "ERRO: SVG canonico nao encontrado em: $OURO_SVG" >&2
  echo "  passe o caminho: ./scripts/gen-brand-assets.sh /caminho/ouroboros.svg" >&2
  exit 1
fi
command -v rsvg-convert >/dev/null || { echo "ERRO: rsvg-convert ausente" >&2; exit 1; }
command -v convert >/dev/null || { echo "ERRO: ImageMagick (convert) ausente" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$BRAND"

# 1) Deriva o SVG so-simbolo (remove o grupo <g id="wordmark">). O
#    wordmark central nao le' em tamanho de icone; o anel + cabeca sim.
python3 - "$OURO_SVG" "$TMP/symbol.svg" <<'PY'
import re, sys
t = open(sys.argv[1]).read()
open(sys.argv[2], 'w').write(re.sub(r'<g id="wordmark".*?</g>', '', t, flags=re.S))
PY

# 2) icon.png — launcher (iOS/legacy). Simbolo colorido, quadrado full-bleed
#    sobre bg canonico (o SO aplica a mascara de cantos).
rsvg-convert -w 1024 -h 1024 "$TMP/symbol.svg" -b "$BG" -o "$TMP/icon.png"
convert "$TMP/icon.png" -strip "$ASSETS/icon.png"

# 3) icon-foreground.png — foreground do adaptive icon Android. Fundo
#    TRANSPARENTE (o adaptiveIcon.backgroundColor pinta atras) + safe-zone:
#    o glifo e' reduzido a $SAFE_PCT e centralizado para o anel externo
#    nao ser cortado pela mascara.
rsvg-convert -w 1024 -h 1024 "$TMP/symbol.svg" -o "$TMP/fg-full.png"
convert "$TMP/fg-full.png" -background none -resize "$SAFE_PCT" \
  -gravity center -extent 1024x1024 -strip "$ASSETS/icon-foreground.png"

# 4) adaptive-icon.png e splash-icon.png — nao referenciados por app.json,
#    mas existem em assets/. Regenerados identicos ao foreground para nao
#    deixar residuo da marca antiga.
cp "$ASSETS/icon-foreground.png" "$ASSETS/adaptive-icon.png"
cp "$ASSETS/icon-foreground.png" "$ASSETS/splash-icon.png"

# 5) splash.png — lockup COMPLETO (com wordmark) sobre bg canonico, com
#    respiro (glifo ~58% do canvas). resizeMode=contain no app.json centra
#    e o letterbox e' o mesmo #14151a (sem salto de cor).
rsvg-convert -w 1200 -h 1200 "$OURO_SVG" -o "$TMP/lockup.png"
convert "$TMP/lockup.png" -background "$BG" -gravity center \
  -extent 2048x2048 -strip "$ASSETS/splash.png"

# 6) favicon.png — web/Gauntlet, so-simbolo sobre bg canonico.
rsvg-convert -w 48 -h 48 "$TMP/symbol.svg" -b "$BG" -o "$TMP/favicon.png"
convert "$TMP/favicon.png" -strip "$ASSETS/favicon.png"

# 7) notification-icon.png — Android renderiza icone de notificacao como
#    mascara MONOCROMATICA (branco sobre transparente). Silhueta do glifo
#    em branco, alpha = cobertura do glifo. NUNCA o icone colorido (viraria
#    blob branco ilegivel). Feature core: lembretes de humor/remedio.
# set 100% (nao 255): ImageMagick e' Q16 aqui, entao 255 daria ~0.4% (quase
# preto). O Android usa so' o ALPHA e tinge com plugins.expo-notifications.color,
# mas a convencao (e outros renderers) esperam RGB branco.
rsvg-convert -w 96 -h 96 "$TMP/symbol.svg" -o "$TMP/notif-base.png"
convert "$TMP/notif-base.png" -channel RGB -evaluate set 100% +channel \
  -strip "$ASSETS/notification-icon.png"

# 8) brand/ouroboros-lockup-512.png — lockup para o README (GitHub sanitiza
#    SVG inline; PNG e' seguro).
rsvg-convert -w 512 -h 512 "$OURO_SVG" -b "$BG" -o "$TMP/lockup-512.png"
convert "$TMP/lockup-512.png" -strip "$BRAND/ouroboros-lockup-512.png"

echo "OK — assets de marca gerados a partir de: $OURO_SVG"
for f in icon.png icon-foreground.png adaptive-icon.png splash-icon.png \
         splash.png favicon.png notification-icon.png brand/ouroboros-lockup-512.png; do
  printf '  %-34s %s\n' "$f" "$(identify -format '%wx%h' "$ASSETS/$f")"
done
