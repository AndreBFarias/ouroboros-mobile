# Sprint M39 — Estrutura canônica de mídia + .md companion (formal ADR-0017)

```
DEPENDE:    M34 (menu verde criou companion preliminar)
BLOQUEIA:   nenhuma (paralela com M37/M38)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Formalizar a estrutura de mídia conforme ADR-0017 (já criado): cada
binário em `media/<categoria>/<basename>.<ext>` ganha `.md` companion
no mesmo diretório com mesmo basename. Companion contém frontmatter
com `tipo`, `arquivo`, `data`, `autor`, `transcricao` (se áudio),
`legenda` (se foto/vídeo), `para` e `origem`. Migrar capturas
existentes (`assets/`) para a estrutura nova. Compatibilidade com
Obsidian e Desktop ETL.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/midia-companion.ts`
  — schema zod do `.md` companion (estende `src/lib/schemas/midia.ts`
  existente):
  ```ts
  export const MidiaCompanionSchema = z.object({
    tipo: z.enum(['midia_foto', 'midia_audio', 'midia_video', 'midia_frase', 'midia_pdf']),
    arquivo: z.string(),  // basename relativo
    data: IsoDatetime,
    autor: PessoaAutorSchema,
    duracao_seg: z.number().int().min(0).optional(),  // audio/video
    transcricao: z.string().optional(),  // audio
    legenda: z.string().optional(),       // foto/video
    para: z.discriminatedUnion('tipo', [...]).default({ tipo: 'mim' }),
    origem: z.string().optional(),         // 'diario_emocional', 'evento', etc.
    origem_ref: z.string().optional(),     // path do registro pai
  });
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/midiaCompanion.ts`
  — helpers canônicos:
  ```ts
  export async function escreverMidiaComCompanion(
    vaultRoot: string,
    binarioUri: string,
    meta: MidiaCompanion
  ): Promise<{ binarioPath: string; companionPath: string }>

  export async function lerCompanion(
    vaultRoot: string,
    binarioPath: string
  ): Promise<MidiaCompanion | null>

  export async function migrarAssetsLegacyParaMedia(
    vaultRoot: string
  ): Promise<{ migrados: number; existentes: number }>
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/vault/midiaCompanion.test.ts`
  — escrita binário + companion, leitura, migração.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarFoto.ts`
  (M34) — substituir companion preliminar por
  `escreverMidiaComCompanion()` formal.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarMusica.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarVideo.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/salvarFrase.ts`
  — usa schema formal para `.md`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/diario/recordAudio.ts`
  / `transcribe.ts` — após gravar áudio + transcrever, usar
  `escreverMidiaComCompanion` para salvar par
  (`media/audios/<basename>.m4a` + `<basename>.md` com transcrição).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — fotos de eventos: criar companion vinculado ao evento via
  `origem: 'evento'`, `origem_ref: <path>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner.tsx`
  — PDFs gerados: companion `tipo: midia_pdf` em `media/scanner/`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useFotosAgregadas.ts`
  — atualizar para varrer `media/fotos/` lendo companions; campo
  `legenda` aparece no `<FotoDetalhe>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/reagendamento.ts`
  — adicionar `migrarAssetsLegacyParaMedia` ao `BOOT_HOOKS` (uma vez
  por install; idempotente).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/index.ts`
  — exportar `MidiaCompanionSchema`.

### Arquivos NÃO modificados

- `media/avatares/pessoa_<a|b>-<ts>.jpg` — sem companion (perfil é
  exceção; ADR-0017 documenta).

## 3. APIs reutilizáveis

- `expo-file-system/legacy` `copyAsync`, `getInfoAsync`,
  `readDirectoryAsync`.
- `writeVaultFile<T>` em `src/lib/vault/io.ts`.
- `formatDateYmd` + helpers de path em `src/lib/vault/paths.ts`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Schemas barrel:** `MidiaCompanionSchema` exportada.
- **Boot hook:** `migrarAssetsLegacyParaMedia` em `BOOT_HOOKS`.
- **5 writers refatorados** para usar helper canônico.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR.
- TS strict.
- Companion **idempotente**: `escreverMidiaComCompanion` chamado 2x
  com mesmos inputs gera o mesmo arquivo (não duplica).
- Migração `migrarAssetsLegacyParaMedia` **opcional** e **idempotente**:
  pode rodar várias vezes sem erro; só move arquivos novos.
- Binários nunca são re-encodados (preservar formato original).

## 5. Procedimento sugerido

1. Criar `MidiaCompanionSchema`.
2. Implementar `escreverMidiaComCompanion()`:
   ```ts
   export async function escreverMidiaComCompanion(vaultRoot, binarioUri, meta) {
     const subpasta = subpastaPara(meta.tipo);  // fotos/audios/videos/frases/scanner
     const basename = `${formatDateYmdHm(meta.data)}-${randomShort()}`;
     const ext = extOf(binarioUri);
     const binarioPath = `${vaultRoot}/media/${subpasta}/${basename}.${ext}`;
     const companionPath = `${vaultRoot}/media/${subpasta}/${basename}.md`;
     await FileSystem.copyAsync({ from: binarioUri, to: binarioPath });
     await writeVaultFile(companionPath, { ...meta, arquivo: `${basename}.${ext}` });
     return { binarioPath, companionPath };
   }
   ```
3. Implementar `lerCompanion()` e `migrarAssetsLegacyParaMedia()`.
4. Refatorar 5 writers para usar helper canônico.
5. Atualizar `useFotosAgregadas` para ler companion.
6. Boot hook + plug.
7. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m39-export && rm -rf /tmp/m39-export

# Manual:
# 1. Após reinstall, abre app: migração move assets/ legacy para media/
# 2. Captura nova foto via menu verde: cria pair binário + .md companion
# 3. Diário emocional com áudio: transcrição vai para companion .md
#    em media/audios/, NÃO no .md do diário (somente referência cruzada)
adb shell ls /sdcard/Documents/Ouroboros/media/audios/
# espera ver pares <basename>.m4a + <basename>.md
```

## 7. Commit

```
feat: m39 midia companion md formal adr 0017 estrutura canonica
```

## 8. Checkpoint visual

2 screenshots Nível A em `docs/sprints/M39-screenshots/`:
- `A-foto-com-companion.png` — galeria com legenda do companion
  visível no detalhe.
- `A-audio-companion-transcricao.png` — companion .md mostrado em
  Obsidian (ou texto no app) com transcrição completa.

## 9. Decisões tomadas

- **`.md` companion ao lado do binário (não em subpasta)**: facilita
  Obsidian indexar (companion vira nota no mesmo nível).
- **Mesmo basename**: `2026-05-02-1430-abcd.m4a` ↔
  `2026-05-02-1430-abcd.md`. Ferramentas (`ls *.md` etc.) cruzam
  trivialmente.
- **`tipo: midia_*` discriminator**: backend ETL Python pode
  filtrar por tipo facilmente.
- **Avatares são exceção**: perfis ficam só como `.jpg` em
  `media/avatares/` sem companion (não há legenda/transcrição).
  Documentado em ADR-0017.
- **Migração opcional**: roda no boot uma vez. Idempotente. Sem
  perda de dados.
- **`origem` + `origem_ref` opcionais**: cobrem caso "foto veio de
  evento X" sem acoplamento forte.

Sprint pronta para execução sem perguntas pendentes.
