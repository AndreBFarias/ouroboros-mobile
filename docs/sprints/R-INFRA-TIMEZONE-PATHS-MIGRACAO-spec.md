# R-INFRA-TIMEZONE-PATHS-MIGRACAO — Vault paths.ts usa o helper canonico de timezone

**Tipo:** refactor (consolidacao timezone — fase 2)
**Prioridade:** P3
**Estimativa:** 0.5-1d
**Fase:** infra
**Depende de:** R-INFRA-TIMEZONE-HELPER-CANONICO (`41363e3` — `src/lib/datetime/local.ts` ja existe)

## Origem

Sub-achado deliberado de R-INFRA-TIMEZONE-HELPER-CANONICO: `src/lib/vault/paths.ts`
tem `formatDateYmd` + `formatDateYmdHm` + `formatDateYmdHms` com o MESMO shift
UTC-3 hardcoded que foi migrado nos puxadores HC, mas NAO foi migrado porque:
- as variantes Hm/Hms precisam de hora/minuto/segundo locais, que o helper atual
  (`datetime/local.ts`, so YMD) nao fornece;
- `formatDateYmd` tem 30+ call sites (paths de markdown/jpg/m4a/mp4/etc).

## Objetivo

1. **Estender `src/lib/datetime/local.ts`** com formatadores de data-hora local
   via Intl: `dataHoraLocalYmdHm(d, tz?)` e `dataHoraLocalYmdHms(d, tz?)`
   (Intl.DateTimeFormat com `hour/minute/second`, `hour12: false`, mesmo
   `TZ_DEFAULT = 'America/Sao_Paulo'`).
2. **Migrar `src/lib/vault/paths.ts`** (`formatDateYmd`/`-Hm`/`-Hms`) para delegar
   ao helper canonico, eliminando o offset hardcoded local.
3. **Paridade bit-a-bit** obrigatoria: BRT (sem DST) deve produzir EXATAMENTE os
   mesmos paths que hoje. Todos os testes de `paths`/writers verdes SEM mudar
   expectativa.

## Investigacao obrigatoria
```bash
grep -n "formatDateYmd\|TZ_OFFSET\|-180\|getUTC\|shift" src/lib/vault/paths.ts
grep -rln "formatDateYmd" src/ | wc -l                      # dimensionar call sites
grep -n "export" src/lib/datetime/local.ts                  # helpers atuais
ls tests/lib/vault/paths*.test.ts                           # cobertura existente
```

## OFF-LIMITS
- NAO mudar os call sites (so a implementacao interna das 3 funcoes formatDate*).
- NAO mudar comportamento BRT (paridade bit-a-bit).
- NAO tocar os puxadores HC (ja migrados na fase 1).

## Acceptance
1. `grep "TZ_OFFSET\|-180" src/lib/vault/paths.ts` → 0 (offset so no helper).
2. Helper exporta `dataHoraLocalYmdHm`/`-Hms` (Intl).
3. Todos os testes de paths/writers verdes sem mudar expectativa (paridade).
4. tsc + smoke + anonimato verdes.

## Verificacao
```bash
grep -rn "TZ_OFFSET\|-180" src/lib/vault/paths.ts
npx jest tests/lib/vault --silent
npx tsc --noEmit
./scripts/smoke.sh
```

## Referencias
- Helper fase 1: `src/lib/datetime/local.ts` (R-INFRA-TIMEZONE-HELPER-CANONICO `41363e3`).
- `src/lib/vault/paths.ts` (formatDateYmd/Hm/Hms).
