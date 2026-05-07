# Sprint L1 — M-MEMORIAS-PARA-SAUDE-FISICA

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~3h
STATUS:     [todo]
```

## §1 Achado

Decisão durável dono 2026-05-06: aba **"Memórias"** vira **"Saúde Física"**
com 3 abas:

- **Treinos** (mantém)
- **Evolução Corporal** (renomeada de "Marcos")
- **Exercícios** (movida de Registrar)

Aba **"Fotos"** REMOVIDA — FAB+ verde já permite tirar foto contextual,
não precisa aba dedicada.

## §2 Tarefa

1. **Renomear rota**: `app/memoria.tsx` → `app/saude-fisica.tsx` (ou
   `app/(tabs)/saude-fisica.tsx` conforme estrutura atual). Atualizar
   todas as referências `router.push('/memoria')` → `'/saude-fisica'`.

2. **`MemoriasScreen.tsx`**:
   - Renomear arquivo para `SaudeFisicaScreen.tsx` (ou manter nome
     interno + atualizar título).
   - Header: "Saúde Física".
   - Tabs: 3 (em vez de 3+ atuais — fotos sai, exercícios entra).

3. **Renomear `MemoriasMarcosTab.tsx`** → `EvolucaoCorporalTab.tsx`.
   - Interno: mantém SecaoEvolucaoCorporal.
   - Label da tab: "Evolução Corporal".

4. **Criar `MemoriasExerciciosTab.tsx`** (ou `ExerciciosTab.tsx`):
   - Reusa lógica de `app/exercicios.tsx` (lista + busca).
   - FAB+ verde injeta ação contextual "Adicionar exercício".

5. **Deletar `MemoriasFotosTab.tsx`**.

6. **`MenuLateral` seção "Registrar"**:
   - Remove item "Exercícios" (movido pra Saúde Física).

7. **`useUltimaRota.ROTAS_NAO_RESTAURAVEIS`**: adicionar
   `/saude-fisica` se for rota modal (provavelmente NÃO — é tab raiz).

8. **Atualizar `docs/FEATURES-CANONICAS.md`** mencionando renomeação +
   nova estrutura.

## §3 Restrições

- Anonimato.
- PT-BR sentence case.
- Sem regressão em testes existentes que importam `MemoriasMarcosTab`.

## §4 Verificação

```bash
npm test --silent
./scripts/smoke.sh
```

## §5 Validação Gauntlet

PNGs:
- `A-saude-fisica-treinos.png`
- `A-saude-fisica-evolucao-corporal.png`
- `A-saude-fisica-exercicios.png`
- `A-menu-lateral-sem-exercicios-em-registrar.png`

## §6 Commit

```
feat: l1 memorias-para-saude-fisica + 3 abas + fotos sai exercicios entra
```

## §7 Decisões

- **"Saúde Física"** vs "Corpo" / "Fitness": dono escolheu o primeiro.
- **"Evolução Corporal"** (não "Evolução"): mais específico, evita
  ambiguidade com "evolução pessoal" (cobre mais que físico).
- **Aba Fotos removida**: FAB+ verde cobre. Reduz superficie + mantém
  atom de UX.
