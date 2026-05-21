# R-RECAP-PERIODO-DIA — Adicionar período "dia" ao Recap

**Tipo**: feature
**Prioridade**: P3-low
**Estimativa**: 1-2h
**Fase**: 3
**Origem**: achado colateral de R-HOME-1 (commit `43d6266`)

## Contexto

Spec original do R-HOME-1 sugeria que botão "Recap" da Tela Hoje navegasse para `/recap?periodo=dia&data=hoje`. Porém `dia` **não existe** como `PeriodoChave` em `src/lib/hooks/useRecap.ts` — apenas `semana | mes | ano | personalizado`.

R-HOME-1 manteve `router.push('/recap')` sem params (igual M40 — comportamento atual). Esta sprint introduz o período `dia` se ainda for desejado pelo dono.

## Objetivo

Adicionar `'dia'` como `PeriodoChave` válido em `useRecap`, com semantics:
- `de`: início do dia local (00:00 BRT)
- `ate`: fim do dia local (23:59:59 BRT)

Atualizar Tela Hoje para navegar com `?periodo=dia&data=hoje`.

UI do Recap também precisa do toggle visual:
- Chips atualmente: Semana / Mês / Ano / Personalizado
- Adicionar: **Dia** / Semana / Mês / Ano / Personalizado (5 chips ou layout adaptado)

## OFF-LIMITS

**Pode tocar**:
- `src/lib/hooks/useRecap.ts` (estender `PeriodoChave`)
- `src/components/recap/PeriodoChips.tsx` (ou similar — adicionar chip "Dia")
- `app/recap.tsx` (rota — parse novo param)
- `app/recap-lista.tsx` (idem)
- `app/index.tsx` (Tela Hoje — `router.push('/recap?periodo=dia&data=hoje')`)

**Não pode tocar**:
- Schema de save (counts derivados, não persistidos)
- Helper `destinos.ts` (R-RECAP-1) — mantém canônico para itens dentro do recap

## Decisão pendente

O dono precisa confirmar:
- **Faz sentido um recap diário?** Recap originalmente é "olhar para trás", `dia` pode parecer redundante com a própria Tela Hoje.
- **Ou Recap continua começando em `semana`?** Tela Hoje cobre o "hoje", Recap cobre "passado".

### Decisão tomada (2026-05-21)

Dono confirmou em prompt do executor: implementar período `dia`. Tela
Hoje passa a abrir `/recap?periodo=dia` para fechar o ciclo "ação do
dia → retrospectiva do dia"; demais períodos (semana/mês/ano/
personalizado) continuam acessíveis via ChipGroup dentro do Recap
(default histórico `semana` quando query param ausente).

## Verificação

```bash
./scripts/smoke.sh
# Live: tela Hoje > Recap > /recap?periodo=dia&data=hoje renderiza
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit (OBRIGATÓRIO).
5. Path do worktree + branch.
6. Decisão do dono confirmada (texto na sprint).
7. Screenshot Gauntlet: `/recap?periodo=dia` renderiza chips + dados.

## Decisões

- P3 porque não bloqueia release (R-HOME-1 entregou tela Hoje funcional sem isso).
- Pode ser descartada se dono confirmar que Recap não tem período diário.
