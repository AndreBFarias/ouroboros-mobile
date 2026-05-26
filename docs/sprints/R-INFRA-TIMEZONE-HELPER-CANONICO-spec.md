# R-INFRA-TIMEZONE-HELPER-CANONICO — Helper unico de dia-local + migrar consumidores

**Tipo:** refactor (consolidacao)
**Prioridade:** P3
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-PASSOS-TIMEZONE-INTL (`ca24dc9` — estabeleceu o padrao Intl no puxador de passos)

## Origem

Achado do executor R-INT-3-HC-PASSOS-TIMEZONE-INTL (2026-05-25): o padrao
Intl-based de "dia local" (substituindo UTC-3 hardcoded) foi aplicado SO no
puxador de passos. Os mesmos `TZ_OFFSET_MIN = -180` / `TZ_SHIFT_MS` hardcoded
persistem em outros consumidores, gerando inconsistencia futura se o fuso mudar
ou se DST entrar em jogo para algum usuario.

Arquivos com o offset hardcoded (confirmados pelo executor):
- `src/lib/health/passosHoje.ts` (criado nesta sessao)
- `src/lib/health/puxadores/sleep.ts`
- `src/lib/health/puxadores/medidas.ts`
- `src/lib/health/puxadores/menstruacao.ts`
- (Vault `paths.ts` e correlatos — avaliar; eram OFF-LIMITS na sprint origem)

## Objetivo

Extrair o padrao Intl ja validado em `puxadores/passos.ts` (`__test__only__`:
`dataLocalYmd`, `offsetMinutos`, `startOfTodayLocal`, `isoToDataLocalYmd`) para um
helper canonico `src/lib/datetime/local.ts`, e migrar os consumidores HC para
usa-lo. Comportamento default (America/Sao_Paulo, BRT) deve permanecer **bit-a-bit
identico** ao atual (zero regressao funcional).

## Escopo
1. `src/lib/datetime/local.ts` (NOVO): mover os helpers Intl-based (mesma logica
   ja testada em passos). Default tz `'America/Sao_Paulo'`, parametrizavel.
2. `src/lib/health/puxadores/passos.ts` (MODIFICAR): passar a importar do helper
   canonico (remover a copia local; manter `__test__only__` re-exportando se os
   testes existentes dependem).
3. Migrar `passosHoje.ts`, `puxadores/sleep.ts`, `medidas.ts`, `menstruacao.ts`
   para o helper. NAO mudar comportamento (D-1, idempotencia, etc).
4. Avaliar Vault `paths.ts` (`formatDateYmd*`) — se trivial e seguro, migrar;
   senao, registrar como sub-achado (NAO forcar).

## OFF-LIMITS
NAO mudar comportamento de agregacao/idempotencia dos puxadores. NAO tocar docs raiz.

## Acceptance
1. Helper canonico unico; consumidores HC sem `TZ_OFFSET_MIN` hardcoded.
2. Todos os testes existentes dos puxadores VERDES sem alteracao de expectativa
   (paridade bit-a-bit BRT).
3. tsc + smoke verde, anonimato + ptbr OK.

## Verificacao
```bash
grep -rn "TZ_OFFSET_MIN\|-180" src/lib/health/   # esperado: 0 apos migracao (so no helper, parametrizavel)
npx jest tests/lib/health --silent
./scripts/smoke.sh
```

## Referencias
- Padrao Intl validado: `src/lib/health/puxadores/passos.ts` (`__test__only__`).
- Achado origem: proof-of-work de R-INT-3-HC-PASSOS-TIMEZONE-INTL (`ca24dc9`).
