# Sprint M10-checkpoint-visual — Heatmap em runtime Android real

```
DEPENDE:    M10 fechada (Mini Humor + cache reader)
            + MOB-bridge-2 com humor-heatmap.json no Vault sincronizado
BLOQUEIA:   nenhuma
ESTIMATIVA: 0,5-1h
PRIORIDADE: baixa (validacao Nivel A capturou empty state)
STATUS:     [todo]
```

## 1. Contexto

M10 entregou MiniHumorScreen (Tela 21) lendo cache via SAF. A
validação Nível A capturou apenas empty state porque
`humor-heatmap.json` é Android-only e em web o cache mock não
existe. Falta evidência visual de runtime real com cache
preenchido.

## 2. Objetivo

Capturar 4 screenshots em Nível B (emulador `ouroboros-test`) ou
Nível C (celular físico, com permissão) com cache real
sincronizado:

1. Heatmap pessoa_a com 91 dias preenchidos.
2. Heatmap pessoa_b idem.
3. Modo sobreposto (50% opacity).
4. DiaHumorModal aberto após tocar célula.

## 3. Procedimento

```bash
./scripts/start-emulator.sh
# Sincronizar Vault de teste com humor-heatmap.json populado:
adb -s emulator-5554 push fixtures/humor-heatmap-mock.json \
  /sdcard/Documents/Ouroboros/.ouroboros/cache/humor-heatmap.json

./run.sh --emulator
# Navegar para /humor, capturar via screencap
```

## 4. Entregáveis

- `docs/sprints/M10-screenshots/A-heatmap-pessoa-a.png`
- `docs/sprints/M10-screenshots/B-heatmap-pessoa-b.png`
- `docs/sprints/M10-screenshots/C-modo-sobreposto.png`
- `docs/sprints/M10-screenshots/D-dia-modal-aberto.png`

## 5. Restrições

- Anonimato absoluto: dados mock com nomes genéricos, nada de
  histórico real.
- Sem permissão explícita do usuário, apenas emulador.

Sprint pronta para execução.
