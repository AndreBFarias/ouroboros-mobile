#!/usr/bin/env bash
# Auditoria estrutural do Vault Ouroboros.
# Uso:
#   ./scripts/check_vault_estrutura.sh <caminho_do_vault>
#
# Varre o diretorio passado, valida invariantes da filosofia
# "dados sao arquivos":
#   - 19 subpastas canonicas presentes (SUBPASTAS_CANONICAS).
#   - .md em pastas de schema parseaveis com bloco YAML frontmatter.
#   - Mídia binária em media/<categoria>/ tem .md companion 1:1
#     (mesmo basename, mesma pasta).
#   - Nomes de arquivo livres de caracteres proibidos no Obsidian
#     (Mac trata ':' como divisor; Windows nao aceita <>:"/\|?*).
#
# Saída:
#   - Linhas tabuladas por pasta com contagens.
#   - Bloco PROBLEMAS no fim listando violacoes.
#   - Exit 0 quando vault canonico e completo, exit 1 caso contrario.
#
# Idempotente, somente leitura. Comentarios sem acento (convencao
# shell/CI).

set -uo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <caminho_do_vault>" >&2
  exit 2
fi

VAULT="$1"

if [[ ! -d "$VAULT" ]]; then
  echo "Erro: vault nao encontrado em $VAULT" >&2
  exit 2
fi

# Subpastas canonicas alinhadas com src/lib/vault/permissions.ts.
SUBPASTAS=(
  "daily"
  "eventos"
  "marcos"
  "treinos"
  "exercicios"
  "medidas"
  "alarmes"
  "tarefas"
  "contadores"
  "inbox/mente/diario"
  "inbox/saude/ciclo"
  "inbox/arquivos"
  "media/fotos"
  "media/audios"
  "media/videos"
  "media/frases"
  "media/avatares"
  "media/scanner"
  ".ouroboros/cache"
)

PROBLEMAS=()

contar_md() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo 0
    return
  fi
  find "$dir" -maxdepth 1 -type f -name '*.md' 2>/dev/null | wc -l | tr -d ' '
}

contar_binarios() {
  local dir="$1"
  local pattern="$2"
  if [[ ! -d "$dir" ]]; then
    echo 0
    return
  fi
  # shellcheck disable=SC2086
  find "$dir" -maxdepth 1 -type f \( $pattern \) 2>/dev/null | wc -l | tr -d ' '
}

# Valida que cada .md tem bloco frontmatter (--- ... ---) no topo.
validar_frontmatter_md() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    return
  fi
  local arq
  while IFS= read -r arq; do
    # head -1 deve ser exatamente '---'.
    local primeira
    primeira=$(head -n 1 "$arq" 2>/dev/null || true)
    if [[ "$primeira" != "---" ]]; then
      PROBLEMAS+=("frontmatter ausente: $arq")
      continue
    fi
    # Procura segundo '---' nas primeiras 50 linhas.
    if ! head -n 50 "$arq" | tail -n +2 | grep -q '^---$'; then
      PROBLEMAS+=("frontmatter aberto sem fechar (50 linhas): $arq")
    fi
  done < <(find "$dir" -maxdepth 1 -type f -name '*.md' 2>/dev/null)
}

# Valida 1:1 binario <-> companion .md em pastas media/<categoria>.
# basename igual: foto-2026-05-04.jpg + foto-2026-05-04.md.
validar_companion_1_para_1() {
  local dir="$1"
  local pattern_bin="$2"
  if [[ ! -d "$dir" ]]; then
    return
  fi
  local arq base ext companion
  while IFS= read -r arq; do
    base=$(basename "$arq")
    # Remove extensao do binario para gerar nome do companion.
    ext="${base##*.}"
    local nome_sem_ext="${base%.*}"
    companion="${dir%/}/${nome_sem_ext}.md"
    if [[ ! -f "$companion" ]]; then
      PROBLEMAS+=("binario sem companion .md: $arq")
    fi
  done < <(find "$dir" -maxdepth 1 -type f \( $pattern_bin \) 2>/dev/null)
}

# Caracteres proibidos em path Obsidian (cross-OS).
# Detecta ':', '?', '*', '|', '<', '>', '"', '\\' em nome de arquivo.
# Nao varre raiz inteira; limita a pastas canonicas para nao tocar
# vault humano paralelo.
validar_caracteres_proibidos() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    return
  fi
  local arq base
  while IFS= read -r arq; do
    base=$(basename "$arq")
    if echo "$base" | grep -q '[:?*|<>"\\]'; then
      PROBLEMAS+=("caractere proibido em nome: $arq")
    fi
  done < <(find "$dir" -maxdepth 1 -type f 2>/dev/null)
}

echo "Auditoria do vault: $VAULT"
echo

# Verifica presenca das 19 subpastas canonicas.
echo "Subpastas canonicas:"
for sub in "${SUBPASTAS[@]}"; do
  full="$VAULT/$sub"
  if [[ -d "$full" ]]; then
    echo "  [ok]      $sub"
  else
    echo "  [ausente] $sub"
    PROBLEMAS+=("subpasta canonica ausente: $sub")
  fi
done
echo

# Pastas com .md de schema (frontmatter validado).
echo "Pastas de registro (.md frontmatter obrigatorio):"
PASTAS_MD=(
  "daily"
  "eventos"
  "marcos"
  "treinos"
  "exercicios"
  "medidas"
  "alarmes"
  "tarefas"
  "contadores"
  "inbox/mente/diario"
  "inbox/saude/ciclo"
)
for pasta in "${PASTAS_MD[@]}"; do
  full="$VAULT/$pasta"
  total=$(contar_md "$full")
  echo "  $pasta/: $total .md"
  validar_frontmatter_md "$full"
  validar_caracteres_proibidos "$full"
done
echo

# Pastas de mídia: binario + companion.
echo "Pastas de mídia (binario + .md companion 1:1):"

dir_fotos="$VAULT/media/fotos"
n_jpg=$(contar_binarios "$dir_fotos" "-iname *.jpg -o -iname *.jpeg -o -iname *.png -o -iname *.webp -o -iname *.heic")
n_md_fotos=$(contar_md "$dir_fotos")
echo "  media/fotos/: $n_jpg binarios + $n_md_fotos companion .md"
validar_companion_1_para_1 "$dir_fotos" "-iname *.jpg -o -iname *.jpeg -o -iname *.png -o -iname *.webp -o -iname *.heic"
validar_frontmatter_md "$dir_fotos"
validar_caracteres_proibidos "$dir_fotos"

dir_audios="$VAULT/media/audios"
n_audio=$(contar_binarios "$dir_audios" "-iname *.m4a -o -iname *.mp3 -o -iname *.ogg -o -iname *.wav -o -iname *.opus")
n_md_audios=$(contar_md "$dir_audios")
echo "  media/audios/: $n_audio binarios + $n_md_audios companion .md"
validar_companion_1_para_1 "$dir_audios" "-iname *.m4a -o -iname *.mp3 -o -iname *.ogg -o -iname *.wav -o -iname *.opus"
validar_frontmatter_md "$dir_audios"
validar_caracteres_proibidos "$dir_audios"

dir_videos="$VAULT/media/videos"
n_video=$(contar_binarios "$dir_videos" "-iname *.mp4 -o -iname *.mov -o -iname *.webm -o -iname *.mkv")
n_md_videos=$(contar_md "$dir_videos")
echo "  media/videos/: $n_video binarios + $n_md_videos companion .md"
validar_companion_1_para_1 "$dir_videos" "-iname *.mp4 -o -iname *.mov -o -iname *.webm -o -iname *.mkv"
validar_frontmatter_md "$dir_videos"
validar_caracteres_proibidos "$dir_videos"

dir_frases="$VAULT/media/frases"
n_md_frases=$(contar_md "$dir_frases")
echo "  media/frases/: $n_md_frases .md (sem binario - frase e texto puro)"
validar_frontmatter_md "$dir_frases"
validar_caracteres_proibidos "$dir_frases"

dir_avatares="$VAULT/media/avatares"
n_avatar=$(contar_binarios "$dir_avatares" "-iname *.jpg -o -iname *.jpeg -o -iname *.png -o -iname *.webp")
n_md_avatares=$(contar_md "$dir_avatares")
echo "  media/avatares/: $n_avatar binarios + $n_md_avatares companion .md"
validar_caracteres_proibidos "$dir_avatares"

dir_scanner="$VAULT/media/scanner"
n_scan=$(contar_binarios "$dir_scanner" "-iname *.jpg -o -iname *.jpeg -o -iname *.png -o -iname *.pdf")
n_md_scanner=$(contar_md "$dir_scanner")
echo "  media/scanner/: $n_scan binarios + $n_md_scanner companion .md"
validar_caracteres_proibidos "$dir_scanner"
echo

# Relato final.
echo "Resumo:"
if [[ ${#PROBLEMAS[@]} -eq 0 ]]; then
  echo "  PROBLEMAS: nenhum"
  exit 0
fi

echo "  PROBLEMAS: ${#PROBLEMAS[@]}"
for p in "${PROBLEMAS[@]}"; do
  echo "    - $p"
done
exit 1
