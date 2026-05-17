#!/usr/bin/env bash
# gauntlet-record.sh -- grava video da sessao Gauntlet via ffmpeg x11grab.
#
# Uso:
#   ./scripts/gauntlet-record.sh [DURATION] [OUTPUT]
#
# Argumentos:
#   DURATION  segundos de gravacao (default 30; aceita 0 para sem limite,
#             encerra via Ctrl-C ou SIGTERM)
#   OUTPUT    caminho do arquivo MP4 (default
#             docs/gauntlet-videos/video-<timestamp>.mp4)
#
# Variaveis de ambiente:
#   GAUNTLET_RECORD_DISPLAY   display X11 (default $DISPLAY ou :0)
#   GAUNTLET_RECORD_FPS       framerate (default 15 -- arquivos menores)
#   GAUNTLET_RECORD_BITRATE   bitrate H.264 (default 500k)
#   GAUNTLET_RECORD_GEOMETRY  WxH+X+Y override (skip auto-detect xdotool)
#   GAUNTLET_RECORD_WINDOW    string match para xdotool search --name
#                             (default "Gauntlet|localhost:80|Ouroboros")
#
# Exemplos:
#   ./scripts/gauntlet-record.sh 5
#   ./scripts/gauntlet-record.sh 60 docs/sprints/r-dx-2-screenshots-gauntlet/demo.mp4
#   GAUNTLET_RECORD_GEOMETRY=1280x720+100+100 ./scripts/gauntlet-record.sh 10
#
# O que faz:
#   1. Detecta DISPLAY ativo (X11) -- aborta se ausente.
#   2. Tenta detectar janela do Chrome via xdotool match no titulo.
#   3. Se achou, grava regiao da janela; senao, grava tela inteira.
#   4. ffmpeg -f x11grab + H.264 (libx264 ultrafast) bitrate baixo.
#   5. Cria diretorio de output se nao existir.
#   6. Encerra em DURATION segundos ou Ctrl-C.
#
# Pre-requisitos: ffmpeg, xdotool (opcional), X11 ativo ($DISPLAY).
# Comentarios sem acento (regra de scripts shell).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DURATION="${1:-30}"
OUTPUT_DEFAULT="docs/gauntlet-videos/video-$(date +%Y%m%d-%H%M%S).mp4"
OUTPUT="${2:-$OUTPUT_DEFAULT}"

# Resolve caminho absoluto do output (preserva paths relativos cwd)
if [[ "$OUTPUT" != /* ]]; then
  OUTPUT="$ROOT/$OUTPUT"
fi

FPS="${GAUNTLET_RECORD_FPS:-15}"
BITRATE="${GAUNTLET_RECORD_BITRATE:-500k}"
DPY="${GAUNTLET_RECORD_DISPLAY:-${DISPLAY:-:0}}"
WINDOW_MATCH="${GAUNTLET_RECORD_WINDOW:-Gauntlet|localhost:80|Ouroboros}"

# Valida duracao
if ! [[ "$DURATION" =~ ^[0-9]+$ ]]; then
  echo "ERRO: DURATION deve ser inteiro >= 0 (recebido: '$DURATION')" >&2
  exit 1
fi

# Valida ffmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERRO: ffmpeg nao instalado. Instale via: sudo apt install ffmpeg" >&2
  exit 1
fi

# Valida X11 ativo (DISPLAY responde a xdpyinfo, se disponivel)
if command -v xdpyinfo >/dev/null 2>&1; then
  if ! DISPLAY="$DPY" xdpyinfo >/dev/null 2>&1; then
    echo "ERRO: X11 display '$DPY' nao responde. Confira \$DISPLAY." >&2
    exit 1
  fi
fi

# Resolve geometria: prioridade env GAUNTLET_RECORD_GEOMETRY > xdotool > tela cheia.
GEOMETRY=""
if [[ -n "${GAUNTLET_RECORD_GEOMETRY:-}" ]]; then
  GEOMETRY="$GAUNTLET_RECORD_GEOMETRY"
elif command -v xdotool >/dev/null 2>&1; then
  # Procura janela do navegador com titulo casando o match.
  # xdotool search devolve uma ou mais window IDs; pegamos a primeira ativa.
  WIN_ID=$(DISPLAY="$DPY" xdotool search --name "$WINDOW_MATCH" 2>/dev/null | head -1 || true)
  if [[ -n "$WIN_ID" ]]; then
    # Geometry no formato "Position: X,Y\nGeometry: WxH"
    GEO_RAW=$(DISPLAY="$DPY" xdotool getwindowgeometry --shell "$WIN_ID" 2>/dev/null || true)
    if [[ -n "$GEO_RAW" ]]; then
      eval "$GEO_RAW"
      # Variaveis exportadas por --shell: X, Y, WIDTH, HEIGHT
      if [[ -n "${WIDTH:-}" && -n "${HEIGHT:-}" ]]; then
        # x11grab exige largura e altura PARES (codec H.264 4:2:0)
        W=$(( WIDTH - WIDTH % 2 ))
        H=$(( HEIGHT - HEIGHT % 2 ))
        GEOMETRY="${W}x${H}+${X:-0}+${Y:-0}"
        echo "Detectada janela Gauntlet (id $WIN_ID): $GEOMETRY"
      fi
    fi
  fi
fi

# Se geometry vazia, pega tela inteira (precisa dimensoes do display)
if [[ -z "$GEOMETRY" ]]; then
  if command -v xdpyinfo >/dev/null 2>&1; then
    DIM=$(DISPLAY="$DPY" xdpyinfo | awk '/dimensions:/ {print $2; exit}')
    if [[ -n "$DIM" ]]; then
      # Garante par (codec)
      W=$(echo "$DIM" | cut -dx -f1)
      H=$(echo "$DIM" | cut -dx -f2)
      W=$(( W - W % 2 ))
      H=$(( H - H % 2 ))
      GEOMETRY="${W}x${H}+0+0"
      echo "Janela Gauntlet nao detectada; gravando tela inteira: $GEOMETRY"
    fi
  fi
fi

if [[ -z "$GEOMETRY" ]]; then
  echo "ERRO: nao foi possivel determinar geometry do display." >&2
  echo "   Defina GAUNTLET_RECORD_GEOMETRY=WxH+X+Y manualmente." >&2
  exit 1
fi

# Extrai WxH e +X+Y da geometry para ffmpeg (-video_size e -i +X,Y)
SIZE=$(echo "$GEOMETRY" | cut -d+ -f1)
OFFSET_X=$(echo "$GEOMETRY" | cut -d+ -f2)
OFFSET_Y=$(echo "$GEOMETRY" | cut -d+ -f3)
INPUT="${DPY}+${OFFSET_X},${OFFSET_Y}"

# Garante diretorio do output
mkdir -p "$(dirname "$OUTPUT")"

# Monta argumento -t (sem -t se DURATION == 0)
if [[ "$DURATION" -eq 0 ]]; then
  DURATION_ARG=()
  echo "Gravando indefinidamente (Ctrl-C para parar)"
else
  DURATION_ARG=("-t" "$DURATION")
  echo "Gravando $DURATION segundos"
fi

echo "  display:  $DPY"
echo "  area:     $GEOMETRY"
echo "  fps:      $FPS"
echo "  bitrate:  $BITRATE"
echo "  output:   $OUTPUT"

# Trap para finalizar limpo via Ctrl-C
FFMPEG_PID=""
cleanup() {
  if [[ -n "$FFMPEG_PID" ]] && kill -0 "$FFMPEG_PID" 2>/dev/null; then
    # Manda 'q' via stdin pra ffmpeg fechar muxer corretamente.
    # Sem isso, MP4 pode ficar corrompido (moov atom nao escrito).
    kill -INT "$FFMPEG_PID" 2>/dev/null || true
    wait "$FFMPEG_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM

# Roda ffmpeg.
# Flags:
#   -f x11grab          captura X11
#   -framerate $FPS     fps de entrada
#   -video_size $SIZE   resolucao da regiao
#   -i $INPUT           display + offset
#   -c:v libx264        codec H.264
#   -preset ultrafast   prioriza CPU baixa sobre compressao
#   -tune zerolatency   menor latencia de codificacao
#   -pix_fmt yuv420p    compativel com players standard
#   -b:v $BITRATE       bitrate alvo (~500kbps -> arquivo pequeno)
#   -y                  sobrescreve output sem perguntar
ffmpeg \
  -hide_banner \
  -loglevel warning \
  -f x11grab \
  -framerate "$FPS" \
  -video_size "$SIZE" \
  -i "$INPUT" \
  "${DURATION_ARG[@]}" \
  -c:v libx264 \
  -preset ultrafast \
  -tune zerolatency \
  -pix_fmt yuv420p \
  -b:v "$BITRATE" \
  -y \
  "$OUTPUT" &
FFMPEG_PID=$!
wait "$FFMPEG_PID"
FFMPEG_EXIT=$?

if [[ $FFMPEG_EXIT -ne 0 ]]; then
  echo "ERRO: ffmpeg saiu com codigo $FFMPEG_EXIT" >&2
  exit "$FFMPEG_EXIT"
fi

# Reporta tamanho do arquivo gerado
if [[ -f "$OUTPUT" ]]; then
  SIZE_HUMAN=$(du -h "$OUTPUT" | cut -f1)
  echo "OK: video salvo em $OUTPUT ($SIZE_HUMAN)"
fi
