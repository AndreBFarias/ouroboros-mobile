# ADR 0023 — Vault organizado por tipo de arquivo

```
Status:     Aceito
Data:       2026-05-06
Sprint:     M-VAULT-LAYOUT-POR-TIPO (H2, plano end-to-end golden-zebra v1.0.0)
Depende:    ADR-0001 (Vault em Markdown Puro)
            ADR-0014 (Vault Mobile em Pasta Dedicada)
            ADR-0017 (Mídia em Formato Original com .md Companion)
            ADR-0019 (Persistência canônica em .md individual)
Substitui:  parte de ADR-0017 que dizia "companion no mesmo diretório
            do binário". Companion `.md` agora vive em `markdown/`,
            independentemente da pasta do binário.
```

## Contexto

Até H1, o Vault organizava arquivos **por feature**:

```
daily/2026-05-06.md
eventos/2026-05-06-cafe.md
inbox/mente/diario/2026-05-06-1430-conflito.md
marcos/2026-05-06-tres-treinos.md
medidas/2026-05-06.md
exercicios/triceps-rosca.md
inbox/saude/ciclo/2026-05-06.md
alarmes/acordar.md
tarefas/limpar-gatos.md
contadores/dias-sem-x.md
inbox/financeiro/nota/2026-05-06-1430-mercado.md
media/fotos/2026-05-06-1430-abcd.jpg
media/fotos/2026-05-06-1430-abcd.md   ← companion
media/audios/2026-05-06-1430-xyz.m4a
media/audios/2026-05-06-1430-xyz.md   ← companion
media/videos/...mp4
media/frases/2026-05-06-frase-do-dia.md
media/scanner/recibo-2026-05-06.pdf
media/scanner/recibo-2026-05-06.md    ← companion
agenda/pessoa_a/2026-05-07-eventId.md
.ouroboros/cache/humor-heatmap.json
```

Esse layout é coerente do ponto de vista de domínio (cada feature
tem seu cantinho), mas tem três problemas práticos:

1. **Ergonomia desktop quebrada via Syncthing.** Quando o dono abre
   a pasta sincronizada no laptop para inspecionar registros, os
   `.md` ficam dispersos em 12+ subpastas. Para abrir tudo no
   Obsidian / vim e ler em sequência, é preciso lembrar onde cada
   feature mora. Um `find . -name "*.md"` resolve, mas é fricção
   diária.

2. **Audit por tipo é trabalhoso.** "Quantas fotos eu tenho neste
   Vault?" exige varrer `media/fotos/`. "Quantos áudios?"
   `media/audios/`. "Quantos GIFs de exercício?"
   `assets/exercicios/`. Cada query precisa saber a árvore.

3. **Companion .md espalhado pelo Vault.** ADR-0017 colocava o
   companion ao lado do binário (`media/fotos/x.jpg` +
   `media/fotos/x.md`). Para um usuário que quer ler todo o
   journal em texto puro (sem abrir as imagens), os `.md`
   ficam misturados com binários.

## Decisão

Reorganizar Vault **por tipo de arquivo**:

```
markdown/                              ← todos os .md (47+ tipos)
  humor-2026-05-06.md
  evento-2026-05-06-cafe.md
  diario-2026-05-06-1430-conflito.md
  marco-2026-05-06-tres-treinos.md
  medidas-2026-05-06.md
  exercicio-triceps-rosca.md
  ciclo-2026-05-06.md
  alarme-acordar.md
  tarefa-limpar-gatos.md
  contador-dias-sem-x.md
  nota-2026-05-06-1430-mercado.md
  foto-2026-05-06-1430-abcd.md           ← companion da foto
  audio-2026-05-06-1430-xyz.md           ← companion do áudio
  video-2026-05-06-1430-qrs.md           ← companion do vídeo
  frase-2026-05-06-frase-do-dia.md
  scanner-recibo-2026-05-06.md           ← companion do scanner
  agenda-pessoa_a-2026-05-07-eventId.md
  _devices.md                            ← devices index

png/                                     ← PNGs específicos
  foto-2026-05-06-1430-abcd.png

jpg/                                     ← JPEGs (fotos + medidas + avatares)
  foto-2026-05-06-1430-abcd.jpg
  medidas-2026-05-06-frente.jpg
  avatar-pessoa_a-1730000000.jpg

m4a/                                     ← áudios
  audio-2026-05-06-1430-xyz.m4a

mp4/                                     ← vídeos
  video-2026-05-06-1430-qrs.mp4

pdf/                                     ← PDFs (scanner, notas)
  scanner-recibo-2026-05-06.pdf
  nota-2026-05-06-1430-mercado.pdf

gif/                                     ← GIFs (exercícios)
  exercicio-triceps-rosca.gif

.ouroboros/cache/                        ← exceção mantida (ADR-0019)
  humor-heatmap.json
  financas-cache.json
```

### Convenções derivadas

1. **Filename incorpora a feature como prefixo.** `humor-`, `evento-`,
   `marco-`, `medidas-`, `exercicio-`, `ciclo-`, `alarme-`, `tarefa-`,
   `contador-`, `nota-`, `foto-`, `audio-`, `video-`, `frase-`,
   `scanner-`, `avatar-`, `agenda-`. Reader faz lista plana
   (`listVaultFolder('markdown/')`) + filtro por prefixo do basename
   (`startsWith('contador-')`) em vez de varrer pasta semântica.

2. **Companion `.md` sempre em `markdown/`, mesmo basename do binário.**
   `jpg/foto-2026-05-06-abcd.jpg` ↔ `markdown/foto-2026-05-06-abcd.md`.
   `frontmatter.midia.arquivo` continua sendo apenas o basename
   (`foto-2026-05-06-abcd.jpg`). O leitor resolve o path completo
   via tabela de extensão (`.jpg → jpg/`).

3. **`png/jpg/gif` separados em vez de `imagens/` unificado.** A
   granularidade facilita audit por tipo ("listar todos os GIFs de
   exercício") e simplifica o roteamento do
   `escreverMidiaComCompanion` baseado em extensão concreta. Custo
   de ter 3 pastas em vez de 1 é trivial.

4. **`.ouroboros/cache/*.json` mantida.** ADR-0019 já documentou
   que estas duas chaves (`humor-heatmap.json`, `financas-cache.json`)
   são caches readonly gerados pelo backend Python e portanto
   exceção legítima ao "tudo é .md no Vault".

5. **Migração via boot hook idempotente.** `migrarVaultLayoutPorTipo`
   é plugado em `BOOT_HOOKS` (mesmo padrão de M30/M37.1.2/M39).
   Detecta arquivos no layout antigo, computa novo path conforme
   convenção, copia/renomeia, marca flag `useSessao.flags.vaultLayoutMigrado`.
   Idempotente: re-run = no-op imediato.

### Helpers canônicos (`src/lib/vault/paths.ts`)

| Helper | Retorna |
|---|---|
| `humorPath(date)` | `markdown/humor-YYYY-MM-DD.md` |
| `diarioPath(date, slug)` | `markdown/diario-YYYY-MM-DD-HHmm-slug.md` |
| `eventoPath(date, slug)` | `markdown/evento-YYYY-MM-DD-slug.md` |
| `marcoPath(date, slug)` | `markdown/marco-YYYY-MM-DD-slug.md` |
| `medidasPath(date)` | `markdown/medidas-YYYY-MM-DD.md` |
| `medidasFotoPath(date, lado)` | `jpg/medidas-YYYY-MM-DD-lado.jpg` |
| `medidasFotoCompanionPath(date, lado)` | `markdown/medidas-foto-YYYY-MM-DD-lado.md` |
| `exercicioPath(slug)` | `markdown/exercicio-slug.md` |
| `exercicioGifPath(slug)` | `gif/exercicio-slug.gif` |
| `cicloPath(date)` | `markdown/ciclo-YYYY-MM-DD.md` |
| `alarmePath(slug)` | `markdown/alarme-slug.md` |
| `tarefaPath(slug)` | `markdown/tarefa-slug.md` |
| `contadorPath(slug)` | `markdown/contador-slug.md` |
| `notaPath(date, slug)` | `markdown/nota-YYYY-MM-DD-HHmmss-slug.md` |
| `notaArquivoPath(date, slug, ext)` | `<ext>/nota-YYYY-MM-DD-HHmmss-slug.<ext>` |
| `fotoPath(date, rand, ext)` | `<ext>/foto-YYYY-MM-DD-rand.<ext>` |
| `fotoCompanionPath(date, rand)` | `markdown/foto-YYYY-MM-DD-rand.md` |
| `audioPath(date, rand)` | `m4a/audio-YYYY-MM-DD-rand.m4a` |
| `audioCompanionPath(date, rand)` | `markdown/audio-YYYY-MM-DD-rand.md` |
| `videoPath(date, rand)` | `mp4/video-YYYY-MM-DD-rand.mp4` |
| `videoCompanionPath(date, rand)` | `markdown/video-YYYY-MM-DD-rand.md` |
| `frasePath(date, slug)` | `markdown/frase-YYYY-MM-DD-slug.md` |
| `scannerPath(slug, ext)` | `<ext>/scanner-slug.<ext>` (`jpg`\|`pdf`) |
| `scannerCompanionPath(slug)` | `markdown/scanner-slug.md` |
| `avatarPath(pessoa, ts)` | `jpg/avatar-pessoa-ts.jpg` |
| `agendaEventoPath(pessoa, iso, eventId)` | `markdown/agenda-pessoa-YYYY-MM-DD-eventId.md` |
| `devicesIndexPath()` | `markdown/_devices.md` |

`VAULT_FOLDERS` exportado canonicamente:

```ts
export const VAULT_FOLDERS = [
  'markdown',
  'png',
  'jpg',
  'm4a',
  'mp4',
  'pdf',
  'gif',
  '.ouroboros/cache',
] as const;
```

## Consequências

### Positivas

- **Ergonomia desktop:** abrir Syncthing no laptop e cair direto
  numa pasta com tudo `.md` (Obsidian feliz, vim feliz).
- **Audit por tipo trivial:** `ls jpg/`, `ls m4a/`, `ls gif/`.
- **Backup seletivo viável:** rsync somente `markdown/` se
  precisar exportar texto rápido.
- **Reader simplificado:** lista plana + filtro por prefixo. Sem
  precisar varrer 12+ subpastas.

### Negativas

- **Quebra ADR-0017** parcialmente: companion não fica mais ao
  lado do binário. Compensado por convenção de basename
  compartilhado (binário + companion mesmo nome, pastas
  diferentes).
- **Migration boot hook** roda no primeiro boot pós-update.
  Custo: alguns segundos para projetos com muitos arquivos
  (200+). Tolerável (não bloqueia UI).
- **Helpers legados mantidos** em `paths.ts` apenas para a
  migration referenciar paths antigos. Não devem ser usados
  por código novo.

### Mitigações

- Migration é idempotente: re-run sem efeito.
- Tolerância a falha I/O por arquivo individual (Syncthing
  concorrente, OEM bloqueando). Próximo boot re-tenta porque a
  flag `vaultLayoutMigrado` só é marcada quando o ciclo todo
  passa.
- Testes auditam paths novos (1593 jest verde após H2).

## Achados colaterais (registrados, não corrigidos em H2)

1. **Share intent receiver (M08, `src/lib/share/categorias.ts`)
   ainda usa layout legado** `inbox/<area>/<subtipo>/`. O subsistema
   de share (PIX, extrato, recibo) é fora do escopo de H2 e tem
   convenção própria (subtipos). Sprint dedicada
   `M-SHARE-INTENT-LAYOUT` deve revisitar esse código e decidir
   como integrar com layout-por-tipo (provavelmente: subtipo vira
   prefixo de filename, binário em `<ext>/`, companion em
   `markdown/`).

2. **`scannerPath` em `src/lib/scanner/saveNota.ts` ainda chama
   `mediaScannerPath` legado.** Sprint dedicada para migrar.

## Referências

- Spec: `docs/sprints/M-VAULT-LAYOUT-POR-TIPO-spec.md`
- Boot hook: `src/lib/boot/migrarVaultLayoutPorTipo.ts`
- Helpers: `src/lib/vault/paths.ts`
- Plano: `docs/PLANO-END-TO-END-V1.0.0-GOLDEN-ZEBRA.md` (Bloco H)
- Decisão durável dono: 2026-05-06 (auditoria pós-H1).
