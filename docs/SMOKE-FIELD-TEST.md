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

- [ ] Onboarding completa: app cria 19 subpastas em `Ouroboros/`.
  Verificar: `daily/`, `eventos/`, `inbox/`, `media/`, `agenda/`,
  `marcos/`, `medidas/`, `exercicios/`, `tarefas/`, `alarmes/`,
  `contadores/`, `treinos/`, `assets/`, `.ouroboros/cache/` etc.

## 1. Captura primária — registros do usuário (.md em pasta semântica)

| # | Ação no app | Arquivo esperado | Schema |
|---|---|---|---|
| 1.1 | Registrar humor (Tela 15) | `daily/YYYY-MM-DD.md` | `humor.ts` |
| 1.2 | Diário emocional trigger/vitória (Tela 18) | `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md` | `diario_emocional.ts` |
| 1.3 | Evento positivo/negativo (Tela 20) | `eventos/YYYY-MM-DD-<slug>.md` | `evento.ts` |
| 1.4 | Marco/treino (memória) | `marcos/YYYY-MM-DD-<slug>.md` ou `treinos/...md` | `marco.ts` / `treino_sessao.ts` |
| 1.5 | Medida corporal (Tela 12) | `medidas/YYYY-MM-DD.md` | `medidas.ts` |
| 1.6 | Exercício (Tela 08) | `exercicios/<slug>.md` | `exercicio.ts` |
| 1.7 | Ciclo menstrual (opt-in) | `inbox/saude/ciclo/YYYY-MM-DD.md` | `ciclo_menstrual.ts` |
| 1.8 | Alarme (opt-in) | `alarmes/<slug>.md` | `alarme.ts` |
| 1.9 | Tarefa (opt-in) | `tarefas/<slug>.md` | `tarefa.ts` |
| 1.10 | Contador "dias sem X" (opt-in) | `contadores/<slug>.md` | `contador.ts` |

**Critério mínimo**: cada `.md` deve ter frontmatter YAML válido
com campos canônicos + corpo opcional em markdown.

## 2. Mídia binária — original + companion `.md` (ADR-0017)

| # | Ação | Binário esperado | Companion `.md` |
|---|---|---|---|
| 2.1 | Foto via /captura → "Foto" | `media/fotos/YYYY-MM-DD-<rand>.jpg` | `media/fotos/YYYY-MM-DD-<rand>.md` |
| 2.2 | Microfone no diário (gravação) | `media/audios/YYYY-MM-DD-<rand>.m4a` | `media/audios/YYYY-MM-DD-<rand>.md` (com transcrição) |
| 2.3 | Vídeo via /captura → "Vídeo" | `media/videos/YYYY-MM-DD-<rand>.mp4` | `media/videos/YYYY-MM-DD-<rand>.md` |
| 2.4 | Frase via /captura → "Frase" | `media/frases/YYYY-MM-DD-<slug>.md` | (próprio arquivo é o conteúdo) |
| 2.5 | Avatar de pessoa (Settings) | `media/avatares/<pessoa>-<ts>.jpg` | (sem companion — metadata em `pessoas.config`) |
| 2.6 | Foto de medida corporal | `media/fotos/medidas-YYYY-MM-DD-<lado>.jpg` | (companion via medidas.ts) |
| 2.7 | Scanner OCR (nota fiscal) | `media/scanner/<slug>.<ext>` (jpg ou pdf multi-page) | `media/scanner/<slug>.md` + `inbox/financeiro/nota/...md` |
| 2.8 | Share intent (PIX, comprovante) | `inbox/financeiro/<subtipo>/...md` + binário ao lado | `inbox_arquivo.ts` |

**Critério crítico**: companion `.md` referencia o binário pelo
nome relativo (`midia: ./<basename>.<ext>`). Apagar o `.md` órfã
não deve quebrar; apagar o binário é detectado pelo reader.

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
| 4.2 | Sincronizar agenda → puxa eventos dos próximos 30 dias | `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md` (1 arquivo por evento) |
| 4.3 | Deletar evento no Google Calendar (web) → reabrir app | `.md` correspondente é removido na próxima sincronização |
| 4.4 | Settings > Contas Google > Revogar | tokens em SecureStore zerados; cache `.md` no Vault permanece |

**Critério**: cada evento é UM `.md` próprio com frontmatter
`AgendaEventoSchema` (id, pessoa, titulo, inicio, fim, local?,
fonte: google_calendar, sincronizado_em).

## 5. Devices index (M38 — multi-device)

- [ ] Primeiro boot do APK fresh: `inbox/_devices.md` ganha entrada
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
  19 subpastas — útil em testes.

## 9. Smoke negativo (defensivo)

- [ ] Apagar manualmente `daily/2026-05-05.md` via gerenciador de
  arquivos → reabrir app → Tela Hoje mostra empty state, não crash.
- [ ] Apagar manualmente `media/fotos/<x>.jpg` mas deixar `.md`
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
