# R-RECAP-NUMEROS-AUDIOVIDEO-CARDS — Cards de áudios e vídeos no grid Números

**Tipo**: feature (débito de R-CRIT-3)
**Prioridade**: P2-medium
**Estimativa**: 1h
**Tranche**: R-RECAP
**Fase**: 3
**Origem**: achado colateral de R-RECAP-3 (commit `9514061`)

## Contexto

R-CRIT-3 (`c722538`) adicionou `audios` e `videos` ao `NumerosRecap`
do hook `useRecap`, mas `RecapSecaoNumeros` em
`src/components/screens/RecapScreen.tsx` ainda renderiza só 6 cards
(registros / treinos / fotos / eventos_pos / eventos_neg / tarefas).

Resultado: áudios e vídeos são contados no `totalNumeros` (afeta
empty state) mas o usuário **não vê** quantos áudios/vídeos foram
capturados no período.

## Objetivo

Adicionar 2 cards no grid Números: **Áudios** e **Vídeos**. Manter
critério de R-RECAP-3 (ocultar se contagem zero).

## Entregáveis

- `src/components/screens/RecapScreen.tsx`: adicionar 2 cards no
  `RecapSecaoNumeros` consumindo `numeros.audios` e `numeros.videos`
- Cards seguem mesmo padrão visual dos outros (Pressable, navegação
  para `/recap-lista?tipo=audio` ou `tipo=video`)
- Rota `/recap-lista` precisa aceitar `tipo=audio` e `tipo=video`
  (verificar e ajustar se ausente)
- Tests:
  - `tests/components/screens/RecapScreen.test.tsx`: assert 2 novos
    cards quando contagens > 0
  - Update do test de empty state — `totalNumeros` continua somando
    audios/videos

## Dependências

- **Bloqueia**: nada (cosmético)
- **Bloqueado por**: nenhuma (R-CRIT-3 já mergeado)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/screens/RecapScreen.tsx`,
`app/recap-lista.tsx` (se ajustar query params).

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5` — esperado +2 testes.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Screenshot Gauntlet do grid com 8 cards visíveis (com vault seed
   contendo áudio + vídeo).
