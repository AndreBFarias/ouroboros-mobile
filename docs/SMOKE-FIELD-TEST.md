# Smoke runtime — checklist de field test

Lista para validar **em runtime real (celular físico)** que cada
feature do app salva os dados corretos no Vault em
`/sdcard/Documents/Ouroboros/`. Executar uma vez ao instalar
APK fresh; toda divergência vira `FIELD-BUG-N` no ROADMAP.

> **Como inspecionar o Vault:** conectar celular via USB, abrir
> gerenciador de arquivos no Android, navegar para
> `Documentos/Ouroboros/`. Cada `.md` deve abrir num editor de
> texto. Binários (jpg, m4a, mp4, pdf) ficam em pastas dedicadas
> com `.md` companion ao lado.

## 0. Bootstrap

- [ ] Onboarding completa: app cria 8 subpastas canônicas em
  `Ouroboros/` (H2 layout-por-tipo, ADR-0023). Verificar:
  `markdown/`, `png/`, `jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/`,
  `.ouroboros/cache/`.

> **H2 layout-por-tipo (ADR-0023):** todos os `.md` agora vivem em
> `markdown/` com prefixo de feature no filename. Binários separados
> por extensão (`png/`, `jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/`).
> Companion `.md` sempre em `markdown/` mesmo para mídia (rompe a
> regra "companion ao lado do binário" do ADR-0017).

## 1. Captura primária — registros do usuário (.md em `markdown/`)

| # | Ação no app | Arquivo esperado | Schema |
|---|---|---|---|
| 1.1 | Registrar humor (Tela 15) | `markdown/humor-YYYY-MM-DD.md` | `humor.ts` |
| 1.2 | Diário emocional trigger/vitória (Tela 18) | `markdown/diario-YYYY-MM-DD-HHmm-<slug>.md` | `diario_emocional.ts` |
| 1.3 | Evento positivo/negativo (Tela 20) | `markdown/evento-YYYY-MM-DD-<slug>.md` | `evento.ts` |
| 1.4 | Marco (memória) | `markdown/marco-YYYY-MM-DD-<slug>.md` | `marco.ts` |
| 1.5 | Medida corporal (Tela 12) | `markdown/medidas-YYYY-MM-DD.md` | `medidas.ts` |
| 1.6 | Exercício (Tela 08) | `markdown/exercicio-<slug>.md` | `exercicio.ts` |
| 1.7 | Ciclo menstrual (opt-in) | `markdown/ciclo-YYYY-MM-DD.md` | `ciclo_menstrual.ts` |
| 1.8 | Alarme (opt-in) | `markdown/alarme-<slug>.md` | `alarme.ts` |
| 1.9 | Tarefa (opt-in) | `markdown/tarefa-<slug>.md` | `tarefa.ts` |
| 1.10 | Contador "dias sem X" (opt-in) | `markdown/contador-<slug>.md` | `contador.ts` |

**Critério mínimo**: cada `.md` deve ter frontmatter YAML válido
com campos canônicos + corpo opcional em markdown.

## 2. Mídia binária — binário em `<ext>/`, companion em `markdown/`

| # | Ação | Binário esperado | Companion `.md` |
|---|---|---|---|
| 2.1 | Foto via /captura → "Foto" | `jpg/foto-YYYY-MM-DD-<rand>.jpg` (ou `png/`) | `markdown/foto-YYYY-MM-DD-<rand>.md` |
| 2.2 | Microfone no diário (gravação) | `m4a/audio-YYYY-MM-DD-<rand>.m4a` | `markdown/audio-YYYY-MM-DD-<rand>.md` (com transcrição) |
| 2.3 | Vídeo via /captura → "Vídeo" | `mp4/video-YYYY-MM-DD-<rand>.mp4` | `markdown/video-YYYY-MM-DD-<rand>.md` |
| 2.4 | Frase via /captura → "Frase" | `markdown/frase-YYYY-MM-DD-<slug>.md` | (próprio arquivo é o conteúdo) |
| 2.5 | Avatar de pessoa (Settings) | `jpg/avatar-<pessoa>-<ts>.jpg` | (sem companion — metadata em `pessoas.config`) |
| 2.6 | Foto de medida corporal | `jpg/medidas-YYYY-MM-DD-<lado>.jpg` | `markdown/medidas-foto-YYYY-MM-DD-<lado>.md` |
| 2.7 | Scanner OCR (nota fiscal) | `pdf/scanner-<slug>.pdf` ou `jpg/scanner-<slug>.jpg` | `markdown/scanner-<slug>.md` (+ legado `inbox/financeiro/nota/...md` enquanto share intent não migra) |
| 2.8 | Share intent (PIX, comprovante) | `inbox/financeiro/<subtipo>/...md` + binário ao lado (legado pré-H2; sprint dedicada migra) | `inbox_arquivo.ts` |

**Critério crítico**: companion `.md` em `markdown/` tem mesmo basename
(sem extensão) que o binário em `<ext>/`. Reader resolve via tabela
de extensão. `frontmatter.midia.arquivo` continua sendo só o basename.
Apagar o `.md` órfão não deve quebrar; apagar o binário é detectado
pelo reader.

## 3. Caches readonly (exceções legítimas — JSON)

| # | Arquivo | Origem |
|---|---|---|
| 3.1 | `.ouroboros/cache/humor-heatmap.json` | Backend Python (gerado fora do app) |
| 3.2 | `.ouroboros/cache/financas-cache.json` | Backend Python |

**Critério**: cache só é LIDO pelo app, nunca escrito. Se ausente,
heatmap mostra empty state.

## 4. Agenda — Google Calendar espelhado (ADR-0019)

| # | Ação | Arquivo esperado |
|---|---|---|
| 4.1 | Conectar conta Google + autorizar `calendar.events.readonly` | (sem arquivo ainda) |
| 4.2 | Sincronizar agenda → puxa eventos dos próximos 30 dias | `markdown/agenda-<pessoa>-YYYY-MM-DD-<eventId>.md` (1 arquivo por evento) |
| 4.3 | Deletar evento no Google Calendar (web) → reabrir app | `.md` correspondente é removido na próxima sincronização |
| 4.4 | Settings > Contas Google > Revogar | tokens em SecureStore zerados; cache `.md` no Vault permanece |

**Critério**: cada evento é UM `.md` próprio com frontmatter
`AgendaEventoSchema` (id, pessoa, titulo, inicio, fim, local?,
fonte: google_calendar, sincronizado_em).

## 5. Devices index (M38 — multi-device)

- [ ] Primeiro boot do APK fresh: `markdown/_devices.md` ganha entrada
  com `deviceId` único do device atual + `nome_amigavel` editável.
- [ ] Abrir Settings > Dispositivos: mostra entrada do device
  atual + qualquer outro previamente sincronizado via Syncthing.

## 6. Backup automático (M-BACKUP-AUTOMATICO)

- [ ] Settings > Backup semanal: toggle (default OFF).
- [ ] Quando ON: ZIP gerado em `.backup/<timestamp>.zip` semanalmente
  (validar criando manualmente via "Exportar agora" se houver).

## 7. Export/import manual (M-EXPORT-COMPLETO)

- [ ] Settings > Exportar todos meus dados: gera ZIP com 100% do
  Vault (`.md` byte-a-byte + binários + manifest sha256).
- [ ] Settings > Importar backup: aceita ZIP + restaura Vault
  byte-a-byte.

## 8. Onboarding e identidade

- [ ] Frame 1: nomes de Pessoa A e B persistidos em SecureStore
  (chave `ouroboros.pessoa.v1`).
- [ ] Frame 2: Vault auto-criado em `/sdcard/Documents/Ouroboros/`.
- [ ] Frame 3: feature toggles (sync method, ciclo opt-in,
  alarme opt-in, etc) persistidos em `useSettings.v2`.
- [ ] Settings > "Reinicializar pasta do Vault": apaga e recria
  8 subpastas canônicas (H2 layout-por-tipo) — útil em testes.

## 9. Smoke negativo (defensivo)

- [ ] Apagar manualmente `markdown/humor-2026-05-05.md` via gerenciador de
  arquivos → reabrir app → Tela Hoje mostra empty state, não crash.
- [ ] Apagar manualmente `jpg/foto-<x>.jpg` mas deixar `markdown/foto-<x>.md`
  companion → galeria mostra placeholder, não crash.
- [ ] Inserir `.md` malformado manualmente → reader ignora com
  warning no console, demais arquivos seguem.
- [ ] Sem permissão de armazenamento (Settings Android) → app
  mostra mensagem clara, não crash.

## 10. Anonimato e PT-BR (Regras invioláveis)

- [ ] Nenhum nome real de pessoa aparece em código no Vault
  (frontmatter usa `pessoa_a` / `pessoa_b` / `casal`).
- [ ] Strings de UI em PT-BR completo com acentuação
  (`Música`, `Não`, `Você`, `Maio de 2026`, `Sáb`).

---

## Reportar bugs

Cada divergência vira `FIELD-BUG-N` em
`docs/field-test-bugs/BUG-N-<slug>-spec.md` no ROADMAP. Anotar
no celular: data, ação, comportamento esperado vs observado,
screenshot se possível.
