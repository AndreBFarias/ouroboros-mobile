#!/usr/bin/env bash
# adb-wifi-pair.sh — conecta o celular por WiFi SEM cabo, via pareamento
# por codigo (Android 11+). Nao precisa de USB em nenhum momento.
#
# No celular: Ajustes > Opcoes do desenvolvedor > Depuracao sem fio (ligar)
#             > "Parear dispositivo com codigo de pareamento"
#             (deixe esse dialogo ABERTO — ele expira ao fechar)
#
# Uso:
#   ./scripts/adb-wifi-pair.sh 123456              # descobre IP:porta via rede
#   ./scripts/adb-wifi-pair.sh 123456 IP:PORTA     # se a descoberta falhar
set -euo pipefail

CODIGO="${1:-}"
ALVO="${2:-}"

if [[ -z "$CODIGO" ]]; then
  echo "Uso: $0 CODIGO_DE_PAREAMENTO [IP:PORTA]"
  echo "O codigo de 6 digitos aparece no dialogo 'Parear dispositivo' do celular."
  exit 1
fi

# Reinicia o adb com descoberta mDNS (necessaria pra achar o celular sozinho).
adb kill-server >/dev/null 2>&1 || true
ADB_MDNS_OPENSCREEN=1 adb start-server >/dev/null 2>&1
sleep 2

if [[ -z "$ALVO" ]]; then
  echo ">> procurando o celular na rede (dialogo de pareamento precisa estar aberto)..."
  for _ in $(seq 1 10); do
    ALVO=$(adb mdns services 2>/dev/null | awk '/_adb-tls-pairing/{print $3; exit}')
    [[ -n "$ALVO" ]] && break
    sleep 2
  done
  if [[ -z "$ALVO" ]]; then
    echo "ERRO: nao achei o servico de pareamento na rede."
    echo "Confira se o dialogo 'Parear dispositivo com codigo' esta aberto e"
    echo "rode de novo passando IP:PORTA que aparecem nele:"
    echo "  $0 $CODIGO IP:PORTA"
    exit 1
  fi
fi

echo ">> pareando com $ALVO"
adb pair "$ALVO" "$CODIGO"

# Depois do pareamento, conecta na porta de DEBUG (diferente da de pareamento).
IP="${ALVO%%:*}"
echo ">> conectando em $IP..."
PORTA_DEBUG=""
for _ in $(seq 1 10); do
  PORTA_DEBUG=$(adb mdns services 2>/dev/null | awk '/_adb-tls-connect/{print $3; exit}' | cut -d: -f2)
  [[ -n "$PORTA_DEBUG" ]] && break
  sleep 2
done
# Fallback: porta fixa 5555 (aparece quando 'Depuracao sem fio' expoe o legado)
if [[ -z "$PORTA_DEBUG" ]] && command -v nmap >/dev/null 2>&1; then
  echo ">> mDNS nao anunciou a porta de debug; varrendo portas no $IP..."
  PORTA_DEBUG=$(nmap -T4 -p 5555,30000-49999 --open "$IP" 2>/dev/null \
    | awk -F/ '/open/{print $1; exit}')
fi
PORTA_DEBUG="${PORTA_DEBUG:-5555}"

adb connect "$IP:$PORTA_DEBUG"
adb devices -l
echo ""
echo "OK: celular conectado. Agora: ./run.sh --device"
