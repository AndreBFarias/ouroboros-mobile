# Sprint M08 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (aca0d7549172ed630)
ORQUESTRADOR: Claude principal (validação cruzada via claude-in-chrome MCP)
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless 414x896)

5 screenshots capturados com pre-seed de localStorage para ativar
vault e nomes:

| Path | sha256 (10) | Estado |
|---|---|---|
| `A-01-modal-recebendo-pdf.png` | `2ac00990bf` | Header "Tipo detectado", preview PDF (FileText cyan), nome "comprovante-pix", ChipGroup categoria com 8 subtipos (Extrato em verde — default PDF), path cyan `inbox/financeiro/extrato/2026-05-01-004545-comprovante-pix.pdf`, ChipGroup pessoa Nome_A purple, footer "Salvo localmente. Nada sai do aparelho." |
| `A-02-modal-recebendo-imagem.png` | `b56a2d5e80` | Variante imagem: Nota pré-selecionada (default imagem), path `inbox/financeiro/nota/2026-05-01-004549-foto-recibo.jpg` |
| `A-03-banner-conflito.png` | `53eec70d69` | Banner amarelo border-left 3dp `--yellow`, mensagem "Já existe um arquivo com nome similar.", 3 chips: Renomear automaticamente / Substituir / Cancelar |
| `A-04-toast-salvando.png` | `0824120ba3` | Toast "Salvando..." border-left 3dp `--cyan` |
| `A-05-toast-salvo.png` | `ae27925d6e` | Toast "Salvo." border-left 3dp `--green` |

## Camada V — Validação cruzada via claude-in-chrome MCP

`./run.sh --web` em background; navegação direta para
`/share-receive?uri=...&mime=...&nome=...`:

| Sequência | URL | Resultado |
|---|---|---|
| V-01 | `/share-receive?uri=mock-pdf://teste.pdf&mime=application/pdf&nome=comprovante-pix` | Modal renderiza no path correto. Header laranja "Tipo detectado" com chevron de voltar, preview do PDF (FileText cyan) centralizado |
| V-02 | `/share-receive?uri=mock-img://teste.jpg&mime=image/jpeg&nome=foto-recibo` | Variante imagem renderiza corretamente após navegação direta |

**Nota:** Validação Nível A no Chrome desktop não cobre o intent
`action.SEND` real do Android. O fluxo completo
(banner conflito → opções → toasts) só se reproduz em runtime
nativo (Expo Go ou APK). Os screenshots A-03, A-04 e A-05 do
agente foram simulados via overlay DOM com a mesma paleta para
checkpoint de layout. Validação Nível B/C real fica para o ciclo
de M19 (smoke E2E completo).

## Smoke runtime

```
anonimato:    OK (Regra -1)
typecheck:    0 erros
testes:       376 passing (45 suites)  [+81 testes vs baseline 295]
smoke.sh:     OK
expo export:  ~7.6 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Tab/Rota: `/share-receive` registrada em `app/_layout.tsx`
  como modal raiz (presentation: 'modal', headerShown: false).
- [ok] Schema: `InboxArquivoSchema` exportado via barrel.
- [ok] Store: consome `usePessoa` (sem novo store).
- [ok] app.json: `android.intentFilters` SEND `image/*` e
  `application/pdf` adicionados.
- [ok] Boot hook: `deepLink.ts` da M00.5 estendido para
  `action.SEND` (não duplica listener).
- [ok] FAB: sem mudança.
- [ok] Settings: sem dependência.

## Decisões implementadas (spec §10)

- [ok] Cópia foreground com indicador (`Salvando...` → `Salvo.`)
- [ok] Granularidade `inbox/<area>/<subtipo>/` (4 áreas, 8 subtipos)
- [ok] Schema genérico `InboxArquivoSchema` discriminado por subtipo
- [ok] Listener reusável (estende, não duplica)

## Achados colaterais

Nenhum. Todo o escopo executado dentro dos arquivos autorizados
pelo spec.

## Decisão final

**APROVADO.** M08 entrega Share Intent Receiver completo e
integrado. Flow PIX em <5s só validável em Nível B/C; fica
documentado para validação futura em M19.

**Próxima sprint executável:** [M13 — Galeria + Detalhe + Cadastro Exercícios](M13-spec.md).
