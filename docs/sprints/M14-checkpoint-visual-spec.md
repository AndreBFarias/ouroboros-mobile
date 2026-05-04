# Sprint M14-checkpoint-visual — Mini Financeiro em runtime Android real

```
DEPENDE:    M14 fechada (MiniFinanceiro reader)
            + MOB-bridge-2 com financas-cache.json no Vault sincronizado
BLOQUEIA:   nenhuma
ESTIMATIVA: 0,5-1h
PRIORIDADE: baixa (validacao Nivel A foi via fixture, nao cache real)
STATUS:     [todo]
```

## 1. Contexto

M14 entregou MiniFinanceiroScreen (Tela 22 readonly) lendo
`financas-cache.json` via SAF. Validação Nível A capturou render
via fixture web (`fixtures/financas-cache-mock.json`). Falta
evidência visual de runtime real com cache do backend Python
sincronizado.

## 2. Objetivo

Capturar 4 screenshots em Nível B (emulador) com cache real:

1. Hero "gasto semana" preenchido com delta cyan/green.
2. Top 5 categorias com barras proporcionais.
3. Lista de 20 últimas transações (despesa cyan, crédito green).
4. Banner "modo leitura" visível.

## 3. Procedimento

```bash
./scripts/start-emulator.sh
adb -s emulator-5554 push fixtures/financas-cache-mock.json \
  /sdcard/Documents/Ouroboros/.ouroboros/cache/financas-cache.json
./run.sh --emulator
# Navegar para /financas
```

## 4. Entregáveis

- `docs/sprints/M14-screenshots/A-hero-real.png`
- `docs/sprints/M14-screenshots/B-categorias-real.png`
- `docs/sprints/M14-screenshots/C-lista-transacoes.png`
- `docs/sprints/M14-screenshots/D-banner-modo-leitura.png`

## 5. Restrições

- Anonimato: fixtures com categorias genéricas (Mercado, Lazer,
  Saúde), valores arredondados.
- Sem permissão explícita, apenas emulador.

Sprint pronta para execução.
