# R-RECAP-6 — M-RECAP-SHARE-SLIDE-MEMORIAS

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-RECAP
**Fase**: 3 (paralelo a Fase 4)
**Origem**: pedido durá­vel do dono em 2026-05-16 — botão "compartilhar" ao lado do botão "som" no slideshow Memórias. Promove parte do backlog Q24.b.c (export PNG stories) para v1.0.

## Objetivo

No `app/recap-memorias.tsx` (slideshow Memórias do Recap), adicionar
**botão "Compartilhar"** ao lado do botão "Som" (criado por R-RECAP-4).
Tap captura o **slide atual como PNG 1080×1920** (formato Instagram
Stories) e dispara o share intent nativo do Android (`expo-sharing`).

## Comportamento esperado

1. Slideshow rodando, usuário vê slide com gradient + número/frase
2. Header superior direito tem 2 ícones lado a lado:
   - **Som** (Volume2/VolumeX — toggle ambient audio, vem de R-RECAP-4)
   - **Compartilhar** (Share2 da lucide-react-native)
3. Tap em Compartilhar:
   - Pausa auto-advance (preserva o slide enquanto captura)
   - Captura PNG 1080×1920 do slide visível via `react-native-view-shot`
   - Toast discreto "Preparando..." durante captura (≤500ms)
   - Salva PNG temporário em `cacheDirectory/recap-share-<timestamp>.png`
   - Dispara `Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar' })`
   - Quando sheet de share fecha, retoma auto-advance se não pausado manualmente
4. **Não persiste** no Vault — é export efêmero pra fora do app

## Hipóteses técnicas

- **`react-native-view-shot`** já é dependência implícita? Verificar `package.json`. Se ausente, adicionar (com aprovação do dono em commit message). Tamanho ~150KB.
- **`expo-sharing`** já é dep (Q22.G usa). Reusar.
- **PNG 1080×1920 forçado** vs **PNG resolução do device**: forçar 1080×1920 para qualidade Instagram Stories (`captureRef` aceita `width`/`height` em props). Renderizar um wrapper View invisível na resolução-alvo via `Animated.View` posicionado fora da viewport — capturar esse, não o visível.

## Áreas a modificar

- `app/recap-memorias.tsx`: header ganha 2 botões (Som + Compartilhar), handler `compartilharSlide()` + estado `compartilhando`
- `src/lib/midia/exportarSlideMemorias.ts` (novo): função pura
  `exportarSlide(slideRef, slideMeta): Promise<string>` retorna URI da PNG
- `src/lib/icons.ts`: re-export `Share2` da lucide-react-native (se ausente)

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: **R-RECAP-4** (cria o botão "Som" — layout do header dos ícones).
  Se R-RECAP-4 ainda não mergeou quando esta sprint executar, **a sprint pode rodar mas precisa coordenar merge manual** no `recap-memorias.tsx` (ambas tocam o mesmo arquivo).
  Recomendação: serializar (R-RECAP-4 → R-RECAP-6) ou unificar via prompt do executor declarando que vai esperar R-RECAP-4 mergear antes de iniciar.

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/recap-memorias.tsx`,
`src/lib/midia/exportarSlideMemorias.ts` (criar), `src/lib/icons.ts`
(re-export). **Pode tocar `package.json`** se `react-native-view-shot`
ausente — mas precisa aprovação explícita do maestro no commit
(comentário no diff). Demais OFF-LIMITS padrão.

## Verificação canônica

```bash
git worktree list
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npx jest --silent | tail -5
./scripts/smoke.sh
```

## Validação visual

Gauntlet obrigatório:
- 1 screenshot do slideshow com os 2 ícones (Som + Compartilhar) lado a lado
- Tap em Compartilhar deveria pausar slide + abrir share sheet (em web isso vai ser mockado — toast confirma)
- Salvar em `docs/sprints/R-RECAP-6-screenshots-gauntlet/`

**Validação runtime celular**: NÃO o executor. Maestro testa pós-merge:
1. Abrir Recap > Memórias no Xiaomi
2. Tap em Compartilhar → share sheet do Android aparece
3. Selecionar WhatsApp/Instagram/Telegram
4. Confirmar PNG 1080×1920 chega no destino com layout correto

## Testes a adicionar (mínimo 3)

1. `tests/lib/midia/exportarSlideMemorias.test.ts`:
   - Captura mockada retorna URI válida
   - Dimensões 1080×1920 forçadas
   - Cleanup do PNG temp após share
2. `tests/app/recap-memorias-share.test.tsx`:
   - Botão Share renderiza ao lado do botão Som
   - Tap pausa slide + chama `compartilharSlide`
   - Erro de captura mostra toast (não trava UI)

## Commit (único)

```
feat: r-recap-6 botao compartilhar slide memorias + export png 1080x1920
```

## Proof-of-work

1. Lista de arquivos modificados (path absoluto, dentro do worktree).
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. 1+ screenshot Gauntlet em `docs/sprints/R-RECAP-6-screenshots-gauntlet/`.
7. Se adicionou `react-native-view-shot` em package.json: justificativa + tamanho + aprovação registrada.
8. Achados colaterais.

## Decisões tomadas

- **PNG 1080×1920 (stories Instagram)** padrão — formato universal de share social. Se dono quiser MP4 no futuro, R-RECAP-7 trata.
- **Export efêmero (cacheDirectory)** — não persiste no Vault. Filosofia preservada (Vault é diário canônico, não galeria de shares).
- **`expo-sharing` nativo** — não constrói UI customizada de seleção (Android cuida).
- **Pausa auto-advance ao tocar** — UX óbvia, preserva o slide enquanto usuário compartilha.
- **Q24.b.c promovido**: backlog antigo "Export memória como PNG stories IG" ganha sprint dedicada com escopo cirúrgico. Q24.b.c marcado como `[ok]` cross-ref desta sprint quando esta mergear.
