# Sprint H2 — M-VAULT-LAYOUT-POR-TIPO

```
DEPENDE:    H1 (vaultUriJoin canônico)
BLOQUEIA:   todo Bloco I (cada feature precisa do novo path layout)
ESTIMATIVA: ~4h
PRIORIDADE: ALTA (decisão arquitetural durável)
ADR:        0023
STATUS:     [todo]
```

## §1 Achado / motivação

Vault hoje organiza arquivos **por feature**:

```
daily/2026-05-06.md
eventos/2026-05-06-cafe.md
inbox/mente/diario/2026-05-06-conflito.md
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
.ouroboros/cache/humor-heatmap.json   ← exceção legítima ADR-0019
```

Decisão durável dono 2026-05-06: reorganizar **por tipo de arquivo**:

```
markdown/
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
  foto-2026-05-06-1430-abcd.md         ← companion da foto
  audio-2026-05-06-1430-xyz.md         ← companion do audio
  video-2026-05-06-1430-qrs.md         ← companion do video
  frase-2026-05-06-frase-do-dia.md
  scanner-recibo-2026-05-06.md         ← companion do scan
  agenda-pessoa_a-2026-05-07-eventId.md
  _devices.md                          ← devices index

png/
  foto-2026-05-06-1430-abcd.jpg

m4a/
  audio-2026-05-06-1430-xyz.m4a

mp4/
  video-2026-05-06-1430-qrs.mp4

pdf/
  scanner-recibo-2026-05-06.pdf

gif/
  exercicio-triceps-rosca.gif

jpg/                                    ← JPEGs específicos (ex: medidas-fotos)
  medidas-2026-05-06-frente.jpg

.ouroboros/cache/                       ← exceção mantida
  humor-heatmap.json
  financas-cache.json
```

**Justificativa do dono**: ergonomia desktop. Quando o usuário abre o Vault
no file manager para inspecionar/sincronizar via Syncthing, todos os `.md`
estão num lugar só (consumível por Obsidian, vim, qualquer editor). Mídias
binárias separadas por extensão facilita escanear "todas as fotos",
"todos os áudios" para backup ou audit.

## §2 Tarefa concreta

1. **Reescrever `src/lib/vault/paths.ts`**. Substituir TODOS os helpers de
   path por nova convenção. Cada feature ganha helper que retorna path do
   `markdown/<feature>-<chave>.md`. Helpers de mídia retornam path do
   binário em `<ext>/<feature>-<chave>.<ext>` + companion `markdown/<feature>-<chave>.md`.

   Lista mínima de helpers a criar (manter assinatura compatível com
   chamadas existentes onde possível):

   - `humorPath(date: Date): string` → `markdown/humor-YYYY-MM-DD.md`
   - `diarioPath(date: Date, slug: string): string` → `markdown/diario-YYYY-MM-DD-HHmm-slug.md`
   - `eventoPath(date: Date, slug: string): string` → `markdown/evento-YYYY-MM-DD-slug.md`
   - `marcoPath(date: Date, slug: string): string` → `markdown/marco-YYYY-MM-DD-slug.md`
   - `medidasPath(date: Date): string` → `markdown/medidas-YYYY-MM-DD.md`
   - `medidasFotoPath(date: Date, lado: string): string` → `jpg/medidas-YYYY-MM-DD-lado.jpg`
   - `medidasFotoCompanionPath(date: Date, lado: string): string` → `markdown/medidas-foto-YYYY-MM-DD-lado.md`
   - `exercicioPath(slug: string): string` → `markdown/exercicio-slug.md`
   - `exercicioGifPath(slug: string): string` → `gif/exercicio-slug.gif`
   - `cicloPath(date: Date): string` → `markdown/ciclo-YYYY-MM-DD.md`
   - `alarmePath(slug: string): string` → `markdown/alarme-slug.md`
   - `tarefaPath(slug: string): string` → `markdown/tarefa-slug.md`
   - `contadorPath(slug: string): string` → `markdown/contador-slug.md`
   - `notaPath(date: Date, slug: string): string` → `markdown/nota-YYYY-MM-DD-HHmmss-slug.md`
   - `notaArquivoPath(date: Date, slug: string, ext: string): string` →
     `<ext>/nota-YYYY-MM-DD-HHmmss-slug.<ext>` (ext detectado do arquivo: pdf, jpg, png)
   - `fotoPath(date: Date, rand: string, ext: string): string` →
     `<ext>/foto-YYYY-MM-DD-rand.<ext>` (jpg ou png)
   - `fotoCompanionPath(date: Date, rand: string): string` → `markdown/foto-YYYY-MM-DD-rand.md`
   - `audioPath(date: Date, rand: string): string` → `m4a/audio-YYYY-MM-DD-rand.m4a`
   - `audioCompanionPath(date: Date, rand: string): string` → `markdown/audio-YYYY-MM-DD-rand.md`
   - `videoPath(date: Date, rand: string): string` → `mp4/video-YYYY-MM-DD-rand.mp4`
   - `videoCompanionPath(date: Date, rand: string): string` → `markdown/video-YYYY-MM-DD-rand.md`
   - `frasePath(date: Date, slug: string): string` → `markdown/frase-YYYY-MM-DD-slug.md`
   - `scannerPath(slug: string, ext: 'jpg' | 'pdf'): string` →
     `<ext>/scanner-slug.<ext>`
   - `scannerCompanionPath(slug: string): string` → `markdown/scanner-slug.md`
   - `avatarPath(pessoa: 'pessoa_a' | 'pessoa_b', ts: number): string` →
     `jpg/avatar-pessoa_a-ts.jpg`
   - `agendaEventoPath(pessoa: 'pessoa_a' | 'pessoa_b', iso: string, eventId: string): string` →
     `markdown/agenda-pessoa_a-YYYY-MM-DD-eventId.md`
   - `devicesIndexPath(): string` → `markdown/_devices.md`

2. **`VAULT_FOLDERS`** export (consumido por `inicializarVaultCanonico` em
   `permissions.ts`): nova lista canônica:

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

3. **Criar boot hook `migrarVaultLayoutPorTipo()`** em
   `src/lib/boot/migrarVaultLayoutPorTipo.ts`:

   - Idempotente: se flag `useSessao.flags.vaultLayoutMigrado === true`, no-op.
   - Detecta arquivos no layout antigo (`daily/*.md`, `eventos/*.md`,
     `marcos/*.md`, `media/fotos/*.jpg`, etc.).
   - Para cada arquivo encontrado, calcula novo path conforme novos
     helpers e copia/renomeia.
   - Marca flag `vaultLayoutMigrado = true` ao final.
   - Em web, no-op.
   - Plug em `BOOT_HOOKS` via `src/lib/boot/reagendamento.ts` (padrão
     M30/M39/M37.1.2).

4. **Atualizar TODOS os writers e readers** que importam helpers antigos.
   Audit grep:

   ```bash
   grep -rn "humorDailyPath\|eventosPath\|diarioEmocionalPath\|marcosPath\|medidasPath\|medidasFotoPath\|exerciciosPath\|cicloPath\|alarmesPath\|tarefasPath\|contadoresPath\|inboxFinanceiroPath\|mediaFotosPath\|mediaAudiosPath\|mediaVideosPath\|mediaFrasesPath\|mediaScannerPath\|mediaAvataresPath" src/ app/
   ```

   Substituir por novos helpers.

5. **Criar ADR-0023** em
   `docs/ADRs/0023-vault-layout-por-tipo.md`. Status: Aceito. Depende:
   ADR-0001 (Vault Markdown), ADR-0014 (pasta dedicada), ADR-0017 (mídia
   companion), ADR-0019 (persistência canônica .md). Justificativa:
   ergonomia desktop (Syncthing, Obsidian) + audit por tipo +
   simplificação de readers (lista plana + filtro por prefixo do filename).

6. **Atualizar `docs/INDEX.md`** dos ADRs.

7. **Atualizar `docs/SMOKE-FIELD-TEST.md`** com novo layout esperado.

8. **Atualizar `docs/BRIEFING.md` §7** (estrutura de pastas do Vault).

9. **Atualizar `docs/FEATURES-CANONICAS.md`** se mencionar paths antigos.

## §3 Restrições invioláveis

- Anonimato Regra −1.
- PT-BR sentence case + acentuação completa em strings UI.
- TS strict 0 erros.
- Sem regressão de testes existentes (1556+ verde).
- Boot hook idempotente (rodar 2× = no-op).
- Migration NÃO bloqueia UI (rodar em background, OK consumir alguns
  segundos para projetos com muitos arquivos).
- Comentários sem acento.

## §4 Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh

# Bundle Hermes não deve crescer mais que 50 KB
npx expo export --platform android --output-dir /tmp/h2-export 2>&1 | tail -5
ls -lh /tmp/h2-export/_expo/static/js/android/*.hbc
rm -rf /tmp/h2-export
```

## §5 Validação Gauntlet OU validação humana

**Gauntlet (Nível A)**: navegar `/agenda` no Gauntlet, registrar evento via
mock, verificar via `__gauntlet.estado()` que arquivo foi criado em
`markdown/agenda-pessoa_a-...md`. PNG `A-vault-layout-tipo.png` em
`docs/sprints/M-VAULT-LAYOUT-POR-TIPO-screenshots/`.

**Validação humana adb (necessária para migration runtime real)**:

```bash
# Pré-condição: APK preview com este commit instalado.
# Pré-condição: Vault tem arquivos antigos (de tests anteriores).

adb shell pm clear com.ouroboros.mobile  # NÃO — perderia dados antigos
# Em vez disso, abrir app + esperar boot hook + verificar:

adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/markdown/ | head -20
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/png/ | head -10
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/m4a/ | head -10
# Pastas antigas (daily/, eventos/, marcos/, etc) devem estar VAZIAS após migration.
```

## §6 Commit message

```
feat: m-vault-layout-por-tipo reorganiza vault por tipo de arquivo + adr-0023
```

## §7 Decisões tomadas

- **`png/jpg/gif` separados em vez de `imagens/` unificado**: granularidade
  facilita audit "todas as fotos" vs "todos os GIFs de exercício". Custo
  de pastas extras é trivial. Documentar em ADR-0023.
- **Companion `.md` na pasta `markdown/` separado do binário**: rompe
  ADR-0017 ("companion no mesmo diretório") em favor da nova convenção.
  ADR-0023 supersedes essa parte do ADR-0017 e deixa explícito que o
  `frontmatter.midia` do companion aponta para `../<ext>/<filename>`.
- **Filename incorpora feature como prefixo**: permite reader fazer lista
  plana de `markdown/` + filtro por prefixo. Sem necessidade de subpastas
  semânticas.
- **`.ouroboros/cache/*.json` mantida**: exceção ADR-0019 preservada.
- **Migration roda em boot hook idempotente**: ADR-0023 documenta.
- **Não usar SQLite para indexar**: inverso da invariante "Vault é arquivos
  do usuário" (ADR-0001).
