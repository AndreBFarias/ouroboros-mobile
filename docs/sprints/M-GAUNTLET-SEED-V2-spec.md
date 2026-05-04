# Sprint M-GAUNTLET-SEED-V2 — Fixtures realistas no seed

```
DEPENDE:    M-GAUNTLET-AUDITORIA fechada
BLOQUEIA:   nenhuma
ESTIMATIVA: 3-4h
PRIORIDADE: media
STATUS:     [todo]
```

## 1. Contexto

Auditoria 2026-05-04 item 23: `seedDeterministico.ts` declara
`seedHumores`, `seedDiarios`, `seedEventos` mas todos são stubs
vazios. Telas que dependem de dados (heatmap humor, calendário,
eventos) renderizam vazio em validação.

## 2. Objetivo

Implementar 3 fixtures realistas chamáveis via Gauntlet API:

1. `seedHumores(dias?: number)` — popula 30 dias de humor com
   intensidades variadas (1-5), tags realistas, alguns dias com
   pessoa_a + pessoa_b para ativar modo sobreposto.
2. `seedDiarios(quantidade?: number)` — gera 3 entradas de diário
   (1 trigger, 1 vitória, 1 reflexão) com tags e contexto social.
3. `seedEventos(quantidade?: number)` — 7 eventos com lugar,
   pessoa, descrição.

Anti-débito: dados anonimizados (Regra −1). Nada de nomes reais.

## 3. Entregáveis

- `src/lib/dev/seedDeterministico.ts` com implementações reais.
- `src/lib/dev/fixtures/humores-30d.json` (template).
- `src/lib/dev/fixtures/diarios-3.json` (template).
- `src/lib/dev/fixtures/eventos-7.json` (template).
- API `__gauntlet.seedComDados(fixture: 'humores-30d' |
  'diarios-3' | 'eventos-7')`.
- Testes Jest dos seeders.
- E2E `m-gauntlet-seed-v2.e2e.ts` validando que após
  `seedComDados('humores-30d')`, heatmap em `/humor` mostra
  células coloridas.

## 4. Restrições

- `GAUNTLET_ATIVO` guard em todos os métodos novos.
- Comentários sem acento.
- Anonimato absoluto.

## 5. Verificação

```bash
npx tsc --noEmit
npm test --silent -- seedDeterministico
./scripts/smoke.sh
./gauntlet.sh
# Em browser: window.__gauntlet.seedComDados('humores-30d');
# Navegar /humor e confirmar heatmap colorido.
```

Sprint pronta.
