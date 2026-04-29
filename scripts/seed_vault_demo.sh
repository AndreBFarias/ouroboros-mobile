#!/usr/bin/env bash
# Popula o Vault fisico (~/Controle de Bordo/) com 3 .md de exemplo
# para o checkpoint visual da Tela 01 da sprint M02. Idempotente:
# nao sobrescreve arquivos ja existentes.
#
# Pastas tocadas (canonicas mobile):
#   daily/2026-04-29.md
#   eventos/2026-04-29-cafe.md
#   inbox/mente/diario/2026-04-29-1430-vit.md
#
# Pastas humanas do usuario (Diario/, Inbox/, Pessoal/) nao sao
# tocadas. ext4 e case-sensitive: 'daily' e 'Diario' coexistem.
set -euo pipefail

VAULT="${VAULT_DIR:-$HOME/Controle de Bordo}"

if [[ ! -d "$VAULT" ]]; then
  echo "ERRO: Vault nao encontrado em $VAULT"
  echo "Defina VAULT_DIR ou crie a pasta antes."
  exit 1
fi

mkdir -p "$VAULT/daily"
mkdir -p "$VAULT/eventos"
mkdir -p "$VAULT/inbox/mente/diario"

DAILY="$VAULT/daily/2026-04-29.md"
EVENTO="$VAULT/eventos/2026-04-29-cafe.md"
DIARIO="$VAULT/inbox/mente/diario/2026-04-29-1430-vit.md"

write_if_absent() {
  local path="$1"
  local content="$2"
  if [[ -f "$path" ]]; then
    echo "skip (existe): $path"
    return 0
  fi
  printf '%s' "$content" > "$path"
  echo "criado: $path"
}

DAILY_CONTENT='---
tipo: humor
data: 2026-04-29
autor: pessoa_a
humor: 4
energia: 3
ansiedade: 2
foco: 4
medicacao: true
horas_sono: 7
tags:
  - trabalho_pesado
  - exercicio
  - boa_conversa
frase: dia denso mas terminei tranquilo.
---

dia denso mas terminei tranquilo.
'

EVENTO_CONTENT='---
tipo: evento
data: 2026-04-29T10:30:00-03:00
autor: pessoa_a
modo: positivo
lugar: padaria do bairro
bairro: bela vista
com:
  - pessoa_b
categoria: rolezinho
intensidade: 4
fotos: []
---

cafe da manha sem pressa. conversa boa.
'

DIARIO_CONTENT='---
tipo: diario_emocional
data: 2026-04-29T14:30:00-03:00
autor: pessoa_a
modo: vitoria
emocoes:
  - alegria
  - gratidao
intensidade: 4
com: []
texto: terminei o que comecei sem travar no meio.
audio: null
---

terminei o que comecei sem travar no meio.
'

write_if_absent "$DAILY" "$DAILY_CONTENT"
write_if_absent "$EVENTO" "$EVENTO_CONTENT"
write_if_absent "$DIARIO" "$DIARIO_CONTENT"

echo "OK: seed concluido"
