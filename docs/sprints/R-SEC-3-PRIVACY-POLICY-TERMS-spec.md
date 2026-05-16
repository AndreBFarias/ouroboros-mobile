# R-SEC-3 — M-SEC-PRIVACY-POLICY-TERMS

**Tipo**: docs
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-SEC
**Fase**: 4

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-3.

Privacy Policy + Terms of Service em 2 páginas HTML via GitHub Pages:
- `https://andrebfarias.github.io/ouroboros-mobile/privacy.html`
- `https://andrebfarias.github.io/ouroboros-mobile/terms.html`

Conteúdo reflete filosofia real: zero analytics, zero crash reporters externos, Vault local + Syncthing/SAF. Linkados no Cloud Console + `app.json` + Settings > Sobre.

## Dependências

- **Bloqueia**: pré-requisito para Cloud Console e Play Console
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `public/privacy.html` + `public/terms.html`, atualizar `docs/RELEASE.md`.

## Verificação canônica

```bash
./scripts/smoke.sh
curl -sf https://andrebfarias.github.io/ouroboros-mobile/privacy.html
```

## Proof-of-work

1. Lista de arquivos criados.
2. URLs no ar (curl OK).
3. Hash do commit.
4. Path do worktree + branch.
