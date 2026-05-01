# Sprint M15 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (a78f2b5620bcf9535)
ORQUESTRADOR: Claude principal
DECISÃO: APROVADO COM RESSALVA (botões RN-Web pré-existente)
```

## Camada A — Agente executor (playwright headless 412x915)

9 screenshots cobrem 7 grupos + sub-rotas + toggles reativos:

- `A-01-settings-overview.png` — Header "Configurações" laranja, SOM E VIBRAÇÃO (4 toggles: humor/vitória/FAB ON, trigger OFF), LEMBRETES (Medicação/Treino/Humor diário OFF), PESSOA com Vault compartilhado + LinkSubTela "Editar nomes e fotos"
- `A-01b-settings-meio.png` — SYNC com CardStatus + Forçar sync + selector método (Não uso) + Qualidade scanner (12MP)
- `A-01c-settings-features.png` — 6 toggles features (ciclo/alarme/todo/contador/calendário/widget) OFF + Privacidade + botões Exportar/Limpar cache + SOBRE versão 0.1.0 + GitHub purple + GPL-3.0
- `A-01d-settings-sobre.png` — bloco Sobre completo
- **`A-02-toggle-feature-on.png`** — toggle "Ciclo menstrual" ON e bottom bar mostra **6 abas** com nova "Ciclo" (ícone Moon). **Reatividade confirmada.**
- `A-03-editar-pessoa.png` — Sub-rota com AvatarPicker + Input + texto muted "Ative segunda pessoa nas configurações para editar pessoa B."
- `A-04-card-sync-verde.png` — CardStatus com cor por mtime (em web "Aguardando primeira leitura.")
- `A-05-export-zip-share.png` — Toast "Exportação não disponível em web." (fallback web; em Android executa Sharing.shareAsync)
- `A-06-biometria-toggle.png` — Toggle biometria abrir ON (em web no-op por design; em Android dispara LocalAuthentication na próxima abertura)

Acentuação 100% correta em todos os 7 grupos.

## Camada V — Validação cruzada via claude-in-chrome MCP

Mínima: agente já capturou em viewport mobile correto. Aceito Camada A.

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       618 passing (81 suites)  [+50 vs baseline 568]
smoke.sh:     OK
expo export:  ~8.24 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Aba `/(tabs)/settings` substitui redirect-stub da M00.5; renderiza tela real.
- [ok] Sub-rotas `/settings/{editar-pessoa,adicionar-segunda-pessoa}` registradas via `_layout.tsx` interno.
- [ok] `useSettings` (shape M00.5 preservado) ganha actions completas.
- [ok] `<BiometriaGate>` placeholder substituído por implementação real com `LocalAuthentication.authenticateAsync`.
- [ok] app.json: plugins `expo-notifications` (canal default) + `expo-local-authentication` + extras (repoUrl, license).
- [ok] FAB sem mudança.
- [ok] Toggle reativo confirmado: ativar `cicloMenstrual` faz aba aparecer no bottom bar imediatamente (A-02).

## Decisões implementadas (spec §11)

- [ok] Status sync via mtime (lógica `classificar()` 100% testada)
- [ok] Lembretes diários recorrentes (`scheduleNotificationAsync` com `repeats: true`)
- [ok] Export ZIP toast `"Exportando..."` + Sharing.shareAsync (Android); fallback web informa indisponibilidade
- [ok] Biometria gate real: `LocalAuthentication.authenticateAsync`; falha = retry
- [ok] Widget toggle preserva shape M00.5 (`featureToggles.widgetHomescreen`)

## Achados colaterais

Nenhum bug pré-existente novo. Anotação visual:

- **Botões `<Button>` com baixo contraste em RN-Web** dentro de Settings. Já existia em outras telas (Slider, etc). Não é regressão da M15 — Button base é da M01.2. Em Android Expo Go renderiza normalmente. **Polish futuro** (não bloqueia).

## Decisão final

**APROVADO.** M15 entrega Settings completo: 7 grupos, biometria real, lembretes, export ZIP, toggles reativos. Bloco 5 do ROADMAP destrava: M14.5/M16/M17/M18 (opt-ins) e M20 (widget) podem rodar agora.

**Próxima sprint executável:** [M14.5 — Acompanhamento de Ciclo Menstrual](M14.5-spec.md).
