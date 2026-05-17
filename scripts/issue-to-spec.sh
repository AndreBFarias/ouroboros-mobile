#!/usr/bin/env bash
# issue-to-spec.sh — gera spec skeleton em docs/sprints/ a partir de
# uma issue do GitHub.
#
# Uso:
#   ./scripts/issue-to-spec.sh <numero-da-issue>
#
# Comportamento:
#   1. Le titulo, body e labels da issue via 'gh issue view N --json ...'.
#   2. Carrega o bloco markdown canonico de docs/sprints/_template-spec.md
#      (bloco entre as fences ```markdown e ```), desescapando as fences
#      internas.
#   3. Substitui placeholders no skeleton:
#        - <TITULO>      ← titulo da issue
#        - <DESCRICAO>   ← body da issue (ou nota se vazio)
#        - <TAGS>        ← labels da issue separadas por virgula
#   4. Gera arquivo docs/sprints/ISSUE-<N>-<SLUG>-spec.md (SLUG derivado
#      do titulo: uppercase, espacos -> hifens, acentos removidos).
#   5. Adiciona entry no final de docs/sprints/_BACKLOG.md (secao
#      "Sprints derivadas de issues") com link para o spec gerado.
#
# Pre-requisitos:
#   - gh CLI autenticado para o repo (gh repo set-default ja resolvido).
#   - python3 (usado pra slugify e pra desescapar template — POSIX puro
#     com sed lida com acentos de forma fragil).
#
# Saidas:
#   - stdout: caminho do spec gerado + nota sobre _BACKLOG atualizado.
#   - exit 0  sucesso
#   - exit 1  uso invalido / numero ausente
#   - exit 2  gh falhou (issue inexistente, sem acesso, sem auth)
#   - exit 3  arquivo de template ausente / bloco nao localizado
#   - exit 4  spec ja existe (evita sobrescrever sem confirmacao)
#
# Origem: R-DX-3 (2026-05-17). Automatiza criacao de spec quando feature
# nova chega via issue GitHub, em vez de aparecer direto no _BACKLOG.

set -euo pipefail

ISSUE_NUM="${1:-}"

if [[ -z "$ISSUE_NUM" ]]; then
  echo "uso: ./scripts/issue-to-spec.sh <numero-da-issue>" >&2
  exit 1
fi

if ! [[ "$ISSUE_NUM" =~ ^[0-9]+$ ]]; then
  echo "ERRO: numero da issue invalido: '$ISSUE_NUM' (espera digitos)" >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
TEMPLATE="$ROOT/docs/sprints/_template-spec.md"
BACKLOG="$ROOT/docs/sprints/_BACKLOG.md"
SPRINTS_DIR="$ROOT/docs/sprints"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "ERRO: template nao encontrado: $TEMPLATE" >&2
  exit 3
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "ERRO: gh CLI nao encontrado no PATH" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERRO: python3 necessario para slugify (acentos)" >&2
  exit 3
fi

# 1) Le issue via gh.
ISSUE_JSON=$(gh issue view "$ISSUE_NUM" --json title,body,labels 2>&1) || {
  echo "ERRO: falha ao ler issue #$ISSUE_NUM via gh CLI" >&2
  echo "  saida gh: $ISSUE_JSON" >&2
  exit 2
}

TITULO=$(printf '%s' "$ISSUE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','') or '')")
BODY=$(printf '%s' "$ISSUE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('body','') or '')")
TAGS=$(printf '%s' "$ISSUE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(l.get('name','') for l in d.get('labels',[])))")

if [[ -z "$TITULO" ]]; then
  echo "ERRO: issue #$ISSUE_NUM nao retornou titulo" >&2
  exit 2
fi

if [[ -z "$BODY" ]]; then
  BODY="(issue #$ISSUE_NUM sem descricao no body — preencher manualmente)"
fi

if [[ -z "$TAGS" ]]; then
  TAGS="(sem labels)"
fi

# 2) Slug do titulo: uppercase, sem acentos, espacos/pontuacao -> hifens.
SLUG=$(printf '%s' "$TITULO" | python3 -c "
import sys, re, unicodedata
t = sys.stdin.read().strip()
t = unicodedata.normalize('NFKD', t).encode('ascii','ignore').decode('ascii')
t = re.sub(r'[^A-Za-z0-9]+', '-', t).strip('-').upper()
# limita a 60 chars para nome de arquivo razoavel
print(t[:60].rstrip('-'))
")

if [[ -z "$SLUG" ]]; then
  echo "ERRO: slug derivado do titulo ficou vazio (titulo: '$TITULO')" >&2
  exit 1
fi

SPEC_NAME="ISSUE-${ISSUE_NUM}-${SLUG}-spec.md"
SPEC_PATH="$SPRINTS_DIR/$SPEC_NAME"

if [[ -e "$SPEC_PATH" ]]; then
  echo "ERRO: spec ja existe: $SPEC_PATH" >&2
  echo "  remova ou renomeie antes de regenerar" >&2
  exit 4
fi

# 3) Extrai bloco canonico do template (entre fences ```markdown ... ```).
#    Desescapa as triplas-crase internas (\`\`\` -> ```).
SKELETON=$(awk '
  /^```markdown$/ { f=1; next }
  f && /^```$/    { exit }
  f               { print }
' "$TEMPLATE")

if [[ -z "$SKELETON" ]]; then
  printf 'ERRO: bloco markdown (fences) nao encontrado em %s\n' "$TEMPLATE" >&2
  exit 3
fi

# Desescapa fences internas (\`\`\` -> ```).
SKELETON=$(printf '%s' "$SKELETON" | sed 's/\\`\\`\\`/```/g')

# 4) Aplica substituicoes:
#    - Cabecalho "Sprint MNN — <titulo...>"  -> "Sprint ISSUE-N — <titulo>"
#    - Apos cabecalho injeta bloco com TAGS e link da issue.
#    - Em "## 1. Objetivo" insere a descricao da issue antes do placeholder.
#    Implementacao via python3 (sed multiline com placeholders acentuados e
#    body multi-linha eh fragil; python3 lida com unicode e quebras de linha
#    corretamente).

PYCODE_RENDER='
import sys, re, os

issue_num = os.environ["PY_ISSUE_NUM"]
titulo    = os.environ["PY_TITULO"]
body      = os.environ["PY_BODY"]
tags      = os.environ["PY_TAGS"]
skeleton  = os.environ["PY_SKELETON"]

# Cabecalho.
skeleton = re.sub(
    r"^# Sprint MNN — <título em Title Case com acentuação completa>",
    f"# Sprint ISSUE-{issue_num} — {titulo}",
    skeleton,
    count=1,
    flags=re.MULTILINE,
)

# Bloco de metadata da issue logo apos o cabecalho e antes do bloco DEPENDE.
# Insere ANTES da primeira ocorrencia de "```\nDEPENDE".
meta = (
    f"\n> Gerado por `scripts/issue-to-spec.sh` a partir da issue "
    f"#{issue_num}.\n"
    f">\n"
    f"> **Tags**: {tags}\n"
)
skeleton = skeleton.replace(
    "\n\n```\nDEPENDE:",
    f"\n{meta}\n```\nDEPENDE:",
    1,
)

# Secao 1 Objetivo: injeta o body antes do placeholder original.
placeholder_obj = (
    "<2 a 4 linhas em prosa: o que essa sprint entrega ponta-a-ponta.\n"
    "Foque em comportamento observável pelo usuário, não em implementação.>"
)
substituido = (
    f"{body}\n\n"
    f"<!-- placeholder original do template (manter como guia, remover ao revisar):\n"
    f"{placeholder_obj}\n"
    f"-->"
)
skeleton = skeleton.replace(placeholder_obj, substituido, 1)

sys.stdout.write(skeleton)
'

# Exporta variaveis para o subprocesso Python ler. Evita issues com
# heredoc + pipe (stdin do `python3 -` recebe o heredoc, nao o pipe) e
# com argumentos contendo aspas/acentos/newlines.
export PY_ISSUE_NUM="$ISSUE_NUM"
export PY_TITULO="$TITULO"
export PY_BODY="$BODY"
export PY_TAGS="$TAGS"
export PY_SKELETON="$SKELETON"

SPEC_CONTENT=$(python3 -c "$PYCODE_RENDER")

unset PY_ISSUE_NUM PY_TITULO PY_BODY PY_TAGS PY_SKELETON

# 5) Escreve spec.
printf '%s\n' "$SPEC_CONTENT" > "$SPEC_PATH"

# 6) Adiciona entry ao _BACKLOG.md. Cria secao "Sprints derivadas de issues"
#    se nao existir; senao, adiciona no fim da secao.
BACKLOG_HEADER="## Sprints derivadas de issues (auto-geradas)"
BACKLOG_MARKER="<!-- entries auto-geradas vao aqui -->"
BACKLOG_ENTRY="- \`ISSUE-${ISSUE_NUM}\` — [${TITULO}](${SPEC_NAME}) — tags: ${TAGS}"

if [[ -f "$BACKLOG" ]]; then
  if grep -qF "$BACKLOG_MARKER" "$BACKLOG"; then
    # Insere entry logo APOS o marker (mantem entries agrupadas na secao).
    # python3 lida com unicode no titulo/tags de forma confiavel.
    export PY_BACKLOG_PATH="$BACKLOG"
    export PY_BACKLOG_MARKER="$BACKLOG_MARKER"
    export PY_BACKLOG_ENTRY="$BACKLOG_ENTRY"
    python3 -c '
import os
path   = os.environ["PY_BACKLOG_PATH"]
marker = os.environ["PY_BACKLOG_MARKER"]
entry  = os.environ["PY_BACKLOG_ENTRY"]
with open(path, "r", encoding="utf-8") as fh:
    txt = fh.read()
# Insere entry logo apos a linha do marker (preserva quebra de linha).
needle = marker + "\n"
idx = txt.find(needle)
if idx == -1:
    # fallback: append no final
    txt = txt.rstrip("\n") + "\n" + entry + "\n"
else:
    insert_at = idx + len(needle)
    txt = txt[:insert_at] + entry + "\n" + txt[insert_at:]
with open(path, "w", encoding="utf-8") as fh:
    fh.write(txt)
'
    unset PY_BACKLOG_PATH PY_BACKLOG_MARKER PY_BACKLOG_ENTRY
    BACKLOG_NOTA="entry inserida em $(basename "$BACKLOG") (apos marker)"
  elif grep -qF "$BACKLOG_HEADER" "$BACKLOG"; then
    # Secao existe mas sem marker — append no final do arquivo.
    printf '%s\n' "$BACKLOG_ENTRY" >> "$BACKLOG"
    BACKLOG_NOTA="entry anexada ao final de $(basename "$BACKLOG") (secao existe sem marker)"
  else
    # Cria secao nova com marker e entry.
    {
      printf '\n%s\n\n' "$BACKLOG_HEADER"
      printf '> Seção semeada por `R-DX-3`. Entradas adicionadas automaticamente por\n'
      printf '> `scripts/issue-to-spec.sh`. Promover para fase/onda apropriada após\n'
      printf '> revisão do dono.\n\n'
      printf '%s\n' "$BACKLOG_MARKER"
      printf '%s\n' "$BACKLOG_ENTRY"
    } >> "$BACKLOG"
    BACKLOG_NOTA="secao criada em $(basename "$BACKLOG") + entry inserida"
  fi
else
  BACKLOG_NOTA="AVISO: $BACKLOG ausente, entry nao registrada"
fi

# Resumo final.
echo "OK: spec gerado em $SPEC_PATH"
echo "    titulo : $TITULO"
echo "    issue  : #$ISSUE_NUM"
echo "    tags   : $TAGS"
echo "    $BACKLOG_NOTA"
echo
echo "Proximo passo: revisar o spec gerado e preencher secoes 2-10."
