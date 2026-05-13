# Q18.b — Integração visual do MidiaExecucaoPlayer

> **Tamanho:** Pequeno (1.5–3h)
> **Bloqueia v1.0.0?** Não — feature aditiva.
> **Pré-requisitos:** Q18 entregue (`MidiaExecucaoPlayer` componente em
> `src/components/exercicios/MidiaExecucaoPlayer.tsx`).

## Contexto

Q18 (commit `1fcbaf5`) entregou o componente reusável
`MidiaExecucaoPlayer` que renderiza GIF/JPG/MP4 com fallback Dumbbell.
Mas o componente está **órfão** — nenhuma tela renderiza ainda.

`ExercicioSchema` já tem campo `gif: z.string().default('')` desde
antes da Onda Q, então o storage funciona; só falta plugar o player
em 3 lugares.

## Objetivo da sprint

Renderizar `MidiaExecucaoPlayer` nas 3 telas onde o usuário consome
exercícios:

1. **Detalhe do exercício** (`/exercicios/<slug>`) — variação `lg`
   (full-width, aspect 16:10) no topo da tela.
2. **Executor de treino** (`app/treinos/executar/<slug>`) — variação
   `sm` (96×96) ao lado do nome do exercício atual no card "Exercício
   N/M".
3. **Galeria** (`/exercicios`) — thumbnail 64×64 no `ExercicioCard`.

## Decisões técnicas firmes

- **Sem novos schemas.** O campo `gif` no `ExercicioSchema` já
  cobre o path relativo. Aceitar GIF/JPG/PNG/MP4 (lib `Image`
  nativa do RN cuida).
- **Validar path no save.** Já existe; nada novo aqui.
- **Empty state.** Quando `gif` vazio (default), o player renderiza
  o ícone Dumbbell — já implementado no Q18.

## Arquivos a modificar

1. `src/components/screens/DetalheExercicio.tsx` (ou nome equivalente)
   - Adicionar `<MidiaExecucaoPlayer path={exercicio.gif} size="lg" />`
     no topo da tela.

2. `app/treinos/executar/[slug].tsx`
   - No card "Exercício atual" (estado executando), adicionar
     `<MidiaExecucaoPlayer path={ex.gif} size="sm" />` em flex-row
     com o título.
   - **Atenção:** o executor consome `RotinaMeta.exercicios`
     (`ExercicioRotina`), que NÃO tem campo `gif`. Precisa:
     - Opção A: adicionar `gif?: string` opcional ao
       `ExercicioRotinaSchema` (snapshot da hora de criar a rotina).
     - Opção B: carregar `Exercicio` por nome no momento da execução
       (`lerExercicio(vault, slug)` com slug derivado).
     - **Decisão:** opção A é mais simples + respeita imutabilidade.
       Bump opcional do schema sem migration (default = `undefined`).

3. `src/components/data/ExercicioCard.tsx`
   - Substituir o ícone Dumbbell pelo thumbnail
     `<MidiaExecucaoPlayer path={exercicio.gif} size="sm" />`.

4. `src/lib/schemas/rotina.ts` — adicionar `gif: z.string().optional()`
   em `ExercicioRotinaSchema`.

5. `src/lib/treino/sessaoFromRotina.ts` — preservar `gif` quando
   presente.

## Proof-of-work esperado

1. **Schema aceita `gif` opcional:**
   ```bash
   npx jest tests/lib/schemas/rotina.test.ts --silent
   # Adicionar 1 teste novo "preserva gif quando presente"
   ```

2. **Visualização no detalhe:**
   ```bash
   # Cadastrar exercício "Agachamento" com GIF anexo
   # Abrir detalhe → confirmar GIF anima no topo
   adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png /tmp/s.png
   ```

3. **Visualização no executor:**
   ```bash
   # Criar rotina com 1 exercício com GIF
   # Iniciar treino → confirmar thumbnail 96×96 ao lado do nome
   ```

4. **Galeria atualizada:**
   ```bash
   # /exercicios → confirmar thumbnails nos cards (ou fallback Dumbbell
   # quando exercício sem GIF)
   ```

## Critérios de aceite

- [ ] `ExercicioRotinaSchema` ganha `gif: z.string().optional()`
- [ ] Detalhe `/exercicios/<slug>` renderiza player em `lg`
- [ ] Executor `app/treinos/executar/<slug>` renderiza player em `sm`
- [ ] Galeria `/exercicios` cards mostram thumbnails
- [ ] Fallback Dumbbell visível quando `gif` vazio em qualquer lugar
- [ ] 1892+1 testes verde mínimo
- [ ] Sprint `[ok]` em ROADMAP

## Anti-débito

Se algum formato exótico (HEIC, AVIF) aparecer e não renderizar,
abrir Q18.b.x com fallback de conversão ou rejeição clara no save.
