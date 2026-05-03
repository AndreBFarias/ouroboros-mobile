# ADR 0017 — Mídia em Formato Original com `.md` Companion para Metadados e Transcrições

```
Status:     Aceito
Data:       2026-05-02
Sprint:     M39 (refundação v1.0)
Depende:    ADR-0001 (Vault em Markdown puro)
            ADR-0014 (Vault Mobile em Pasta Dedicada)
```

## Contexto

A v1.0.0-rc1 já preservava binários (fotos, áudios, PDFs do scanner)
em formato original em pastas como `assets/<data>-evento-<idx>.jpg`.
Mas:

1. Cada feature usava convenções diferentes (`assets/`, `media/`,
   nada).
2. Transcrições de áudio (M06.5) ficavam dentro do frontmatter do
   `.md` que disparou a gravação (`inbox/mente/diario/...md`),
   acoplando a transcrição à origem. Se o usuário deletasse o
   diário, perdia a transcrição.
3. Obsidian e Desktop ETL Python não conseguiam indexar mídia de
   forma independente do registro de origem.
4. Frases curtas (registro de "frase do dia" pelo menu verde da
   M34) não tinham casa — viravam diários ou eventos forçados.

Faltava um padrão **canônico, autodescritivo e independente da
origem** para mídia.

## Decisão

Toda mídia capturada pelo Mobile vive sob `media/` no Vault, em
subpastas por tipo. Cada binário tem um **`.md` companion** no mesmo
diretório com o mesmo basename:

```
media/
├── fotos/
│   ├── 2026-05-02-1430-abcd.jpg          # binário original preservado
│   └── 2026-05-02-1430-abcd.md           # companion frontmatter + legenda
├── audios/
│   ├── 2026-05-02-1431-efgh.m4a
│   └── 2026-05-02-1431-efgh.md           # companion + transcrição
├── videos/
│   ├── 2026-05-02-1432-ijkl.mp4
│   └── 2026-05-02-1432-ijkl.md
├── frases/
│   └── 2026-05-02-1433-uma-frase.md      # só .md (frase é texto)
├── avatares/
│   └── pessoa_a-1714658400.jpg           # sem companion (perfil)
└── scanner/
    ├── 2026-05-02-1434-mnop.pdf
    └── 2026-05-02-1434-mnop.md
```

### Schema do `.md` companion

```yaml
---
tipo: midia_audio                          # midia_foto | midia_video | midia_audio | midia_frase | midia_pdf
arquivo: 2026-05-02-1431-efgh.m4a          # nome do binário no mesmo diretório
data: 2026-05-02T14:31:00-03:00            # ISO datetime UTC-3
autor: pessoa_a                            # PessoaAutor (ADR-0011)
duracao_seg: 47                            # int (audio/video apenas)
transcricao: |                             # string multiline (audio apenas)
  Texto transcrito completo do áudio.
  Pode ter múltiplas linhas.
legenda: |                                 # string multiline (foto/video opcional)
  Legenda escrita pelo usuário.
para:                                      # ADR-0033 (campo "para" — quem é o destinatário)
  tipo: mim
origem: diario_emocional                   # opcional: feature que gerou
origem_ref: inbox/mente/diario/2026-05-02-1430-tristeza.md   # path do registro pai
---

(corpo do .md vazio por convenção; frontmatter é a fonte de verdade)
```

### Convenção de nomes

`<YYYY-MM-DD>-<HHmm>-<rand4>.<ext>` para todos os binários e
companions:

- `<YYYY-MM-DD>` em UTC-3 (`formatDateYmd`).
- `<HHmm>` hora local 24h.
- `<rand4>` 4 chars alfanuméricos para deduplicar dois binários no
  mesmo minuto.
- `<ext>` original do arquivo (`.jpg`, `.png`, `.m4a`, `.mp4`,
  `.pdf`, `.mov`, etc.).

## Helpers canônicos

Em `src/lib/vault/midiaCompanion.ts`:

```ts
export async function escreverMidiaComCompanion(
  vaultRoot: string,
  binarioUri: string,
  meta: MidiaCompanionMeta
): Promise<{ binarioPath: string; companionPath: string }> {
  // 1. Resolve subpasta por tipo (fotos / audios / etc.)
  // 2. Gera nome canonico
  // 3. Copia binario (FileSystem.copyAsync) preservando ext
  // 4. Escreve .md companion via writeVaultFile<MidiaCompanionMeta>
  // 5. Retorna paths para o caller anotar referência
}

export async function lerCompanion(
  vaultRoot: string,
  binarioPath: string
): Promise<MidiaCompanionMeta | null> { ... }
```

Funções idempotentes — chamadas duplas com mesmos inputs não geram
arquivos duplicados.

## Estrutura de arquivos onde a decisão vive

- `src/lib/vault/midiaCompanion.ts` — helpers canônicos.
- `src/lib/schemas/midia.ts` — `MidiaCompanionMetaSchema` zod.
- Captura: `app/eventos.tsx`, `app/diario-emocional.tsx`,
  `app/scanner.tsx`, `src/components/chrome/MenuCapturaVerde.tsx`,
  `src/components/ui/AvatarPicker.tsx` (avatar é exceção — sem
  companion).

## Consequências

### Positivas

- Cada binário é **autodescritivo**: se Syncthing copiar para outro
  desktop, basta ler o `.md` ao lado.
- Obsidian indexa as transcrições e legendas como qualquer outra
  nota do vault.
- Desktop ETL Python pode varrer `media/` diretamente sem precisar
  resolver referências nos registros pai.
- Frases curtas têm casa própria (`media/frases/`), separadas de
  diários e eventos.
- Deletar registro de origem (ex: diário emocional) **não** apaga a
  transcrição do áudio.

### Negativas

- Duas vezes mais arquivos no Vault (1 binário + 1 companion). Mas
  cada `.md` companion é < 1 KB; impacto de espaço desprezível.
- `useFotosAgregadas` e queries similares precisam ler companion
  para meta — pequeno custo extra de I/O.

## Migração

Captura existente da v1.0.0-rc1 (poucos arquivos de teste em
`assets/`):

- M39 inclui hook `migrarAssetsLegacyParaMedia()` opcional, que move
  `assets/<*.jpg>` → `media/fotos/<*.jpg>` + cria companion mínimo.
- Idempotente — pode rodar múltiplas vezes.

## Verificação

```bash
ls /sdcard/Documents/Ouroboros/media/audios/
# espera ver pares <basename>.m4a + <basename>.md

# Inspeção de companion
cat /sdcard/Documents/Ouroboros/media/audios/2026-05-02-1431-efgh.md
# espera ver frontmatter com tipo, arquivo, data, autor, transcricao
```

## Referências

- ADR-0001 — Vault em Markdown Puro (companion é `.md`)
- ADR-0014 — Vault Mobile em Pasta Dedicada (`~/Protocolo-Ouroboros/`)
- ADR-0016 — Vault Auto-criado em Android (cria `media/` na
  inicialização)
- Sprint M39 — implementa este ADR
- Sprint M34 — primeiro consumidor (menu verde captura unificada)
