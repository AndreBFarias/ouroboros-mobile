#!/usr/bin/env bash
# Popula o Vault fisico (~/Protocolo-Ouroboros/) com 3 .md de exemplo
# para o checkpoint visual da Tela 01 da sprint M02. Idempotente:
# nao sobrescreve arquivos ja existentes.
#
# Pastas tocadas (canonicas mobile):
#   daily/2026-04-29.md
#   eventos/2026-04-29-cafe.md
#   inbox/mente/diario/2026-04-29-1430-vit.md
#
# Decisao de 2026-04-29: Vault Mobile separado do Vault humano do
# Obsidian (~/Controle de Bordo). Pasta dedicada ~/Protocolo-Ouroboros
# eh sincronizada via Syncthing entre desktop e Note13-Andre. Backend
# desktop apontara para essa pasta em sprint MOB-bridge.
set -euo pipefail

VAULT="${VAULT_DIR:-$HOME/Protocolo-Ouroboros}"

if [[ ! -d "$VAULT" ]]; then
  echo "ERRO: Vault nao encontrado em $VAULT"
  echo "Defina VAULT_DIR ou crie a pasta antes."
  exit 1
fi

mkdir -p "$VAULT/daily"
mkdir -p "$VAULT/eventos"
mkdir -p "$VAULT/inbox/mente/diario"
mkdir -p "$VAULT/treinos"
mkdir -p "$VAULT/marcos"

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

# M11: 3 sessoes de treino + 2 marcos + 1 marco auto.
TREINO1="$VAULT/treinos/2026-04-23-rotina-a.md"
TREINO2="$VAULT/treinos/2026-04-25-rotina-b.md"
TREINO3="$VAULT/treinos/2026-04-28-rotina-a.md"

TREINO1_CONTENT='---
tipo: treino_sessao
data: 2026-04-23T18:00:00-03:00
autor: pessoa_a
rotina: Rotina A
duracao_min: 28
exercicios:
  - nome: supino reto
    series: 3
    reps: 8
    carga_kg: 4
    observacao: tranquilo, sem dor
  - nome: remada baixa
    series: 3
    reps: 8
    carga_kg: 6
observacoes: leve, voltei depois de 3 dias parado.
---

sessao boa.
'

TREINO2_CONTENT='---
tipo: treino_sessao
data: 2026-04-25T18:30:00-03:00
autor: pessoa_a
rotina: Rotina B
duracao_min: 35
exercicios:
  - nome: agachamento livre
    series: 4
    reps: 10
    carga_kg: 30
  - nome: leg press
    series: 3
    reps: 12
    carga_kg: 60
---

pernas pesadas.
'

TREINO3_CONTENT='---
tipo: treino_sessao
data: 2026-04-28T19:00:00-03:00
autor: pessoa_a
rotina: Rotina A
duracao_min: 32
exercicios:
  - nome: supino reto
    series: 3
    reps: 8
    carga_kg: 6
  - nome: remada baixa
    series: 3
    reps: 8
    carga_kg: 8
---

melhor que terca.
'

write_if_absent "$TREINO1" "$TREINO1_CONTENT"
write_if_absent "$TREINO2" "$TREINO2_CONTENT"
write_if_absent "$TREINO3" "$TREINO3_CONTENT"

MARCO1="$VAULT/marcos/2026-04-20-primeira-semana.md"
MARCO2="$VAULT/marcos/2026-04-26-rotina-completa.md"
MARCO3_AUTO="$VAULT/marcos/2026-04-29-tres-treinos.md"

MARCO1_CONTENT='---
tipo: marco
data: 2026-04-20T20:00:00-03:00
autor: pessoa_a
descricao: Primeira semana acompanhando humor todos os dias.
tags:
  - humor
  - consistencia
auto: false
---

semana fechada.
'

MARCO2_CONTENT='---
tipo: marco
data: 2026-04-26T19:30:00-03:00
autor: pessoa_a
descricao: Fechei rotina A e B na mesma semana.
tags:
  - treino
auto: false
---
'

MARCO3_AUTO_CONTENT='---
tipo: marco
data: 2026-04-29T21:00:00-03:00
autor: pessoa_a
descricao: Tres treinos nesta semana.
tags:
  - treino
  - consistencia
auto: true
origem: client
hash: abc123def456
---
'

write_if_absent "$MARCO1" "$MARCO1_CONTENT"
write_if_absent "$MARCO2" "$MARCO2_CONTENT"
write_if_absent "$MARCO3_AUTO" "$MARCO3_AUTO_CONTENT"

echo "OK: seed concluido"
