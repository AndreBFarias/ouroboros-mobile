# R-CRIT-3 — M-MIDIA-AUSENTE-EM-RECAP-E-GALERIA

**Tipo**: bug (persistência / listadores)
**Prioridade**: P0-critical
**Estimativa**: 3-5h
**Tranche**: R-CRIT
**Fase**: 1 (bloqueia R-RECAP-1 a R-RECAP-4, F1)

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-CRIT → R-CRIT-3.

**Sintoma**: foto/áudio/vídeo capturados via FAB Câmera/Microfone
não aparecem em `/galeria`, `.md` do diário, ou Recap > Memórias.

**Hipóteses técnicas**:
- Regressão filtro `sync-conflict` em listadores periféricos
  (AUDIT-T1B6 cobriu 4; outros pendentes — agora `[ok]` mas
  validar)
- Race condition write binário antes do `.md` (AUDIT-T2-LOCK-VAULT
  já corrigiu deviceId suffix; revalidar)
- SAF vs `file://` read divergência em HyperOS
- Listadores agregadores fixados em path antigo (`fotos/` vs
  `media/fotos/`)

**Sprints relevantes**: Q9 (Galeria), Q18.b (player), I-FOTO/I-AUDIO/I-VIDEO.

## Dependências

- **Bloqueia**: R-RECAP-1, R-RECAP-2, R-RECAP-4, R-MEDIA-1, R-MEDIA-2, R-HOME-1, F1
- **Bloqueado por**: R0 (lexical, paralelo possível)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/lib/vault/galeria.ts`,
`src/lib/midia/*`, `src/lib/hooks/useFotosAgregadas.ts`,
`src/lib/diario/saveDiario.ts` (apenas leitura — pode rever),
companions `.md`.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test ADB:
adb pull /sdcard/Documents/Ouroboros/media/ /tmp/vault-media-pos-fix
# Diff esperado: cada captura tem binario + companion .md
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Caso E2E novo cobrindo foto mockada → galeria mock → recap mock.
7. Validação Nível C: ADB pull mostra companions `.md` válidos para 3 capturas teste.
8. Achados colaterais.
