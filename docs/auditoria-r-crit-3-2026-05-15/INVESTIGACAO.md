# Investigação R-CRIT-3 — Mídia ausente em Recap e Galeria

Sprint **R-CRIT-3** da Onda R. Investigação conduzida em 2026-05-15.

Sintoma reportado pelo dono: foto/áudio/vídeo capturados via FAB
Câmera/Microfone/Vídeo **não aparecem** em `/galeria`, no `.md` do
diário correspondente, nem em Recap > Memórias.

## Mapa de fluxo (linha de base, antes do fix)

### Captura

| Origem | Helper | Binário (relativo ao Vault) | Companion `.md` |
|---|---|---|---|
| FAB → Foto/Câmera | `capturarFoto` | `jpg/foto-YYYY-MM-DD-<rand>.jpg` ou `png/foto-...png` | `markdown/foto-YYYY-MM-DD-<rand>.md` |
| FAB → Música | `capturarMusica` | `m4a/<YYYY-MM-DD>-<rand>.m4a` (sem prefixo `audio-`) | `markdown/<YYYY-MM-DD>-<rand>.md` (sem prefixo `audio-`) |
| FAB → Vídeo | `capturarVideo` | `mp4/video-YYYY-MM-DD-<rand>.mp4` | `markdown/video-YYYY-MM-DD-<rand>.md` |
| Microfone (Tela 18) | `saveRecordingToVault` | `m4a/audio-YYYY-MM-DD-<rand>.m4a` | `markdown/audio-YYYY-MM-DD-<rand>.md` |
| FAB → Frase | `salvarFrase` | (sem binário) | `markdown/frase-YYYY-MM-DD-<slug>.md` |

### Leitura

| Consumer | O que lê | Cobertura |
|---|---|---|
| `/galeria` (Q9) → `listarItensGaleria` | `markdown/` + filtros por prefixo `foto-`, `audio-`, `video-`, `frase-`, etc | Detecta foto/áudio/vídeo standalone via companion |
| `useFotosAgregadas` (aba Fotos) | `jpg/foto-*`, `jpeg/foto-*`, `png/foto-*` + eventos + medidas | Só pega fotos com prefixo `foto-` |
| `useRecap.contarFotos` | `diario.midia[].tipo === 'foto'` e `evento.midia[].tipo === 'foto'` | **Só fotos embutidas em diários/eventos**; ignora standalone |
| `useRecapMemorias` (slide Memórias) | `data.conquistas`, `data.crises`, `data.numeros.{registros, treinos, tarefas}` | **Não tem slide de mídia** |

## Cenário 1: Foto via FAB Câmera

### Trace
1. Usuário aperta FAB verde → tap "Foto" → `MenuCapturaVerde.handleFoto`.
2. Chama `capturarFoto({ origem: 'galeria' })` (não `'camera'`, mesmo
   o sintoma sendo "FAB Câmera"; o item do menu é único).
3. `capturarFoto` abre `ImagePicker.launchImageLibraryAsync`,
   recebe asset, chama `gravar()`.
4. `gravar()` calcula:
   - `binarioRel = jpg/foto-YYYY-MM-DD-<rand>.jpg`
   - `companionRel = markdown/foto-YYYY-MM-DD-<rand>.md`
   - `destinoBin = vaultUriJoin(vaultRoot, binarioRel)`
   - `destinoCompanion = vaultUriJoin(vaultRoot, companionRel)`
5. Sequência **não-atômica**: `copyAsync` do binário, depois
   `writeAsStringAsync` do companion.

### Observado
- `/galeria` (`listarItensGaleria`) **deveria** listar o companion. Ele
  procura em `markdown/` por prefixo `foto-` e usa o `MidiaCompanionSchema`.
  Funciona.
- `useFotosAgregadas.lerGaleriaManual` lê `jpg/` filtrando por prefixo
  `foto-`. Funciona.
- `useRecap.contarFotos` NÃO conta esta foto: ela não está em
  `diario.midia[]` nem em `evento.midia[]`. **Número `fotos` no
  Recap fica 0** mesmo com 10 fotos capturadas.
- `useRecapMemorias` NÃO tem slide de mídia; não exibe nada do que
  foi capturado standalone via FAB.

### Causas raiz
1. **Recap ignora mídia standalone** — `useRecap.contarFotos`
   pressupõe que toda foto está embutida num diário/evento; isso era
   verdade antes da Onda Q (Q9 galeria unificada) mas saiu de sincronia
   desde a captura standalone via FAB virou a UX default.
2. **Recap > Memórias não tem slide de mídia** — Q24.b entregou MVP de
   slideshow com 5 slides fixos (`abertura | numeros | vitorias |
   crises | encerramento`); o ID `'midias'` simplesmente não existe no
   enum `SlideId`.
3. **Race condition potencial** — `capturarFoto.gravar` é não-atômico:
   se `copyAsync` falha e `writeAsStringAsync` é interrompido entre as
   chamadas (ANR, kill do OS, sair do app), o binário pode existir sem
   companion (ou vice-versa) e o usuário fica com órfão silencioso.

### Fixes
1. **Atomicidade write binário+companion** — em `capturarFoto`,
   `capturarVideo`, `saveRecordingToVault` e
   `escreverMidiaComCompanion`: ordem garantida (binário primeiro,
   companion depois). Se companion falha, deletar binário órfão
   (best-effort, idempotent) — evita estado parcial.
2. **`useRecap` conta mídia standalone** — adicionar contagem de
   `markdown/foto-*.md`, `markdown/audio-*.md`, `markdown/video-*.md`
   no `agregarRecap` via lista crua. Inclui no `numeros.fotos`.
3. **Slide Memórias de mídia** — `useRecapMemorias` ganha slide
   `'midias'` com contagem total de foto+áudio+vídeo do período, mais
   amostra de até 4 binários para grid visual.
4. **Sintoma "não aparece no `.md` do diário"** — isto não é bug do
   código. A foto standalone via FAB **não é** anexada a nenhum
   diário; é registro próprio. Caso real: anexar foto a diário via
   Tela 18 (`MidiaPicker` + `MidiaFotoTab`), que grava em
   `meta.midia[]` do diário. Este fluxo já funciona (`useFotosAgregadas`
   lê eventos/medidas, e a galeria detecta via companion). Não há fix
   técnico aqui; documentar comportamento esperado.

## Cenário 2: Áudio via Microfone

### Trace
1. Usuário pressiona MicrofoneButton (Tela 18 do Diário Emocional) →
   `startRecording` → `stopRecording` → `saveRecordingToVault`.
2. `saveRecordingToVault` calcula:
   - `binarioRel = m4a/audio-YYYY-MM-DD-<rand>.m4a` (via `audioPath`)
   - `companionRel = markdown/audio-YYYY-MM-DD-<rand>.md` (via
     `audioCompanionPath`)
   - `vaultUriJoin` + `copyAsync` + `writeAsStringAsync`.
3. Caller (`saveDiario`) recebe o path do binário e embute em
   `meta.audio` (campo do `DiarioEmocionalSchema`).

### Observado
- Galeria `/galeria` lista `markdown/audio-*.md` (`listarItensGaleria`
  via prefixo `audio-`). Funciona.
- `useFotosAgregadas` NÃO lê áudios — só fotos. Não é regressão; é
  por design (hook é fotos-only).
- `useRecap` NÃO conta áudios em nenhum agregado (só
  `contarFotos`).
- `useRecapMemorias` não tem slide de áudio.

### Causa raiz adicional ao cenário 1
4. **FAB → Música usa basename SEM prefixo `audio-`** —
   `capturarMusica` monta `arquivo = ${formatDateYmd(agora)}-${rand}.${ext}`
   (sem prefixo de feature), passa para `escreverMidiaComCompanion`.
   O helper grava `m4a/2026-05-15-abcd.m4a` e `markdown/2026-05-15-abcd.md`
   (sem `audio-` no nome). Resultado: `listarItensGaleria.inferirTipoDoFilename`
   NÃO casa com `'audio-'` (nem com qualquer outro prefixo) e o
   companion é silenciosamente ignorado. **Música escolhida via FAB
   nunca aparece na Galeria.**

### Fix
5. **`capturarMusica` precisa prefixo `audio-`** — o basename
   gerado deve ser `audio-YYYY-MM-DD-<rand>.<ext>`. Trocar a string
   template para `audio-${formatDateYmd(agora)}-${rand}.${ext}`.

## Cenário 3: Vídeo via FAB Vídeo

### Trace
1. FAB → "Vídeo" → `capturarVideo({ origem: 'galeria' })`.
2. `capturarVideo` abre picker, recebe asset, chama `gravar()`.
3. `gravar()` calcula `mp4/video-YYYY-MM-DD-<rand>.mp4` + companion
   `markdown/video-YYYY-MM-DD-<rand>.md`.

### Observado
- Galeria `/galeria` lista (prefixo `video-`). Funciona.
- `useFotosAgregadas` NÃO lê vídeos (fotos-only).
- `useRecap` NÃO conta vídeos.
- `useRecapMemorias` não tem slide de vídeo.

### Causa raiz
Mesmas três do cenário 1 (atomicidade + Recap fotos-only + slide
Memórias ausente). Não há causa específica de vídeo.

## Outras pegadinhas encontradas (vão para o fix consolidado)

### A) `useFotosAgregadas` é fotos-only mas se vende como "Memórias"

A aba "Fotos" da MemoriasScreen consome `useFotosAgregadas`. Se a
intenção da UX é "ver tudo que registrei", o hook está nominalmente
correto (fotos) mas seu nome em contexto induz erro. Não há fix
de código aqui — é de naming/UX, fora do escopo desta sprint.
Anotado para sprint futura de UX.

### B) `escreverMidiaComCompanion` não é atômico

Em `src/lib/vault/midiaCompanion.ts`:
```ts
await FileSystem.copyAsync({ from: binarioUri, to: destinoBin });
// ... validação meta ...
await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);
```

Se o app for morto entre as duas linhas, fica binário órfão (sem
companion). `listarItensGaleria` ignora o binário órfão (lista só
companions). `useFotosAgregadas` lista os JPG órfãos — eles aparecem
sem metadata.

### C) `lerCompanion` tem fallback legado mas `escreverMidiaComCompanion` não emite no layout legado

`lerCompanion` (`midiaCompanion.ts`) tenta `markdown/<basename>.md`
primeiro, depois `<pasta_do_binario>/<basename>.md`. O writer atual só
escreve no layout novo. OK; o fallback é só para legado migration.

## Resumo dos fixes a aplicar

1. **`capturarMusica.ts`**: prefixo `audio-` no basename para que a
   galeria detecte o item.
2. **`useRecap.ts`**: novo agregado `mediaStandalone` lendo
   `markdown/` por prefixos `foto-`, `audio-`, `video-`; somar em
   `numeros.fotos` (+ contagem nova de áudios e vídeos). Inclui no
   shape e expõe em `RecapData`.
3. **`useRecapMemorias.ts`**: novo slide `'midias'` com contagem
   total de foto+áudio+vídeo standalone do período. Insere entre
   `'vitorias'` e `'crises'`.
4. **`midiaCompanion.escreverMidiaComCompanion`**: garantir atomicidade
   — se write companion falhar, deletar binário (best-effort).
5. **`capturarFoto.gravar`**, **`capturarVideo.gravar`**,
   **`recordAudio.saveRecordingToVault`**: mesma garantia de
   atomicidade (delete binário se companion falhou).
6. **Testes**: ≥5 testes cobrindo: (a) capturarMusica gera prefixo
   `audio-`; (b) useRecap conta mídia standalone do período;
   (c) useRecapMemorias gera slide midias quando há foto/audio/video;
   (d) atomicidade — companion fail leva a binário deletado;
   (e) galeria detecta companion gerado por capturarMusica corrigido.

## Off-limits respeitados

Tocando apenas: `src/lib/midia/*` (capturarMusica, capturarFoto,
capturarVideo), `src/lib/vault/midiaCompanion.ts`,
`src/lib/hooks/useRecap.ts`, `src/lib/hooks/useRecapMemorias.ts`,
`src/lib/diario/recordAudio.ts`, novos testes em `tests/lib/`.

`app/recap-memorias.tsx` precisa um caso novo para renderizar slide
`'midias'`; isso entra no escopo desta sprint porque o hook
`useRecapMemorias` exporta o novo `SlideMidias` e a UI consumiria via
o switch existente. Caso decida tocar app/, registrar como achado
colateral; alternativa minimalista: hook expor mas UI exibir só em
sprint futura. Optei por incluir a renderização para não deixar
o slide invisível.
