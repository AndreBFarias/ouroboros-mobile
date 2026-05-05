# Features Canônicas — Ouroboros

Mapa funcional consolidado do projeto. **Fonte de verdade única
sobre o que o app faz** (assumindo o roadmap M21–M41 fechado).

> **Importante — manutenção obrigatória:** este arquivo deve ser
> atualizado **junto com o commit que introduz, modifica ou remove
> uma feature**. Sprints novas devem incluir checklist na seção 8
> da spec ("Checkpoint visual") com o item:
>
> - [ ] `docs/FEATURES-CANONICAS.md` atualizado.
>
> Validador-sprint **recusa** sprint que toca UI ou schema sem
> esta atualização.

> **Para que serve:**
> - Documentação de produto (lista do que o app faz).
> - Base para versão **desktop** do programa (mesmas features,
>   stack diferente).
> - Onboarding de novos contribuidores em <30min.
> - Referência cruzada com `BRIEFING.md` (design system + 24
>   telas) e `ADRs/INDEX.md` (decisões arquiteturais).

> **Atualizado em:** 2026-05-04 (sessão maratona M11.1 → M34
> fechadas; M35 → M41 + corretivas pendentes).

---

## 1. Identidade e onboarding

| Feature | Sprint | Detalhe |
|---|---|---|
| Onboarding 3 frames | M03 + M22 + M23 | Nomes + fotos das pessoas → vault auto-criado em `/sdcard/Documents/Ouroboros` (sem SAF) → confirmação |
| Modo solo / duo (casal) / amigos | M03 + M29 | Definido no onboarding e ajustável em Settings |
| Identidade dinâmica | M03 + M28 | `pessoa_a` / `pessoa_b` com nome + foto + cor (purple `#bd93f9` / pink `#ff79c6`) persistido em SecureStore |
| `useNomeDe(pessoa)` hook | M28 | Hook reativo canônico, todo lugar consome (zero hardcode "Pessoa A") |
| Editar nomes/fotos | M15 + M29 | Settings → "Editar nomes e fotos" |
| Adicionar segunda pessoa | M15 + M29 | Solo → duo via Settings |

## 2. Capturas ativas

### 2.1 Humor Rápido — M05 (Tela 15)

- Sheet 70% com 4 sliders 1-5 (humor / energia / ansiedade / 1
  variável a definir).
- Texto livre de medicação + horas de sono.
- ChipGroup multi de 8 tags fechadas (alegria / ansiedade / calma
  / cansaço / foco / irritação / tranquilidade + 1).
- Textarea opcional de nota.
- Persiste em `daily/YYYY-MM-DD.md`.
- Detecção de colisão de pessoa (sufixo `-pessoa_<x>.md`).
- Flow alvo <30s.

### 2.2 Diário Emocional — M06 + M33 (Tela 18)

- 3 modos: **Trigger** (com motivo), **Vitória**, **Reflexão**.
- Campos: descrição livre, tags, contexto social.
- Campo `para` (M33): para mim / para [parceiro] / para o casal.
- Foto opcional anexada.
- Persiste em `diario/YYYY-MM-DD/<slug>.md`.

### 2.3 Eventos com lugar — M07 + M33 (Tela 20)

- Subtipos: rolezinho / compras / consulta / trabalho / evento
  social / rotina / exercício / outro.
- "Com quem" — chips dinâmicos (pessoa_a / pessoa_b / ambos).
- Fotos múltiplas (cap 6 por evento via `expo-image-picker`).
- Mídia anexada: Spotify track / YouTube / Foto / Áudio.
- Slider "Como foi?" 1-5.
- Campo `para`.
- Persiste em `eventos/YYYY-MM-DD/<slug>.md`.

### 2.4 Conquistas com mídia obrigatória — M07.x (Telas 18, 20)

- 4 tipos: foto / áudio / vídeo / oEmbed (Spotify, YouTube).
- Mídia obrigatória — sem mídia, não salva.
- Companion `.md` com YAML frontmatter (formalizado em M39).

### 2.5 Microfone — F-14 / M06.5 (Tela 18, **dev-client only**)

- Botão `MicrofoneButton` grava áudio + transcreve on-device
  (`expo-speech-recognition`).
- Modo contínuo até 5min.
- Áudio salvo em `media/audio/`, transcrição vai pro diário
  emocional.

### 2.6 Scanner OCR — M09 (Tela 16, **dev-client only**)

- Câmera nativa em alta resolução.
- Multipágina → consolida em PDF.
- ML Kit text recognition extrai valor / categoria / data /
  bairro.
- Persiste em `financas/notas/YYYY-MM-DD-<slug>.md` + imagem
  original.
- (Pré-M09: aba Finanças mostra "Em desenvolvimento" honesto —
  M35.)

### 2.7 Share Intent Receiver — M08 (Tela 17)

- Recebe via "Compartilhar" do Android: imagem / vídeo / áudio /
  texto / link / PDF / documento / arquivo genérico (8 subtipos
  canônicos).
- Triagem: salvar como evento / diário / conquista / inbox.
- Persiste em `inbox/<data>-<slug>.md` + binário.

### 2.8 Captura unificada — M-CAPTURA-UNIFICADA

- Item "Câmera" do MenuLateral abre a rota `/captura` (modal raiz
  `transparentModal`, padrão M26) com `<SheetEscolhaCaptura>`:
  dois cards verticais grandes, área de toque ≥ 88dp, sem badge
  e sem cor de festa.
  - **Registrar momento** (`ImagePlus` verde, "Foto, música, vídeo
    ou frase.") → dismissa o sheet e navega para
    `/memoria?abrirCaptura=1`. `MemoriasScreen` lê a query via
    `useLocalSearchParams` e expande o `<MenuCapturaVerde>`
    automaticamente 1 frame após mount via prop `abrirNoMount`.
  - **Escanear documento** (`ScanLine` cyan, "Nota fiscal,
    comprovante.") → dismissa e navega para `/scanner`
    (`<ScannerSheet>` M09 quando dev-client; em ambiente sem ML
    Kit nativo o sheet mostra `EmptyState` honesto via
    comportamento existente).
- `<MenuCapturaVerde>` permanece em Memórias como atalho rápido
  contextualizado; `/captura` é o ponto de decisão único do menu
  lateral. Rota está na lista `ROTAS_SEM_FAB` para o `<FABMenu>`
  não competir z-index com o sheet de decisão.

### 2.9 MenuCapturaVerde — M34 + M34.3 (em Memórias)

- **FAB verde único** no canto direito da tela Memórias (substituiu
  os FABs próprios das tabs em M34.3, que colidiam em z-order com
  o FAB verde nas mesmas coordenadas).
- Sheet "Registrar" mostra 5 ações: **1 ação contextual da tab
  ativa** (Novo treino / Adicionar foto / Adicionar marco) + 4
  ações de captura (Foto / Música / Vídeo / Frase).
- Cada captura salva binário em `media/<categoria>/<data-rand>.<ext>`
  + companion `.md` com `tipo`, `arquivo`, `data`, `autor`,
  `para`, `legenda`.
- Item contextual delega para o sheet interno da tab
  (`SheetNovoTreino`, `expo-image-picker`, `SheetNovoMarco`).

## 3. Memórias e Marcos — M11 + M11.1 (Telas 09, 10, 11)

3 abas: **Treinos / Fotos / Marcos**.

### 3.1 Treinos
- Heatmap 13×7 (91 dias) com paleta verde, **centralizado
  horizontalmente** (M11.1).
- Stats "X treinos em 90 dias".
- Tap em célula abre detalhe da sessão.
- CRUD de sessão de treino: rotina, duração, observações,
  exercícios feitos, peso/reps.
- "Novo treino" agora é item do MenuCapturaVerde unificado
  (M34.3); abre `SheetNovoTreino` interno.
- Atalho ghost "Cadastrar exercícios na Galeria" no empty state
  (M11.1) navega para `/exercicios`.

### 3.2 Fotos
- Galeria agregada que varre todas as fotos do Vault (eventos +
  marcos + medidas + galeria-manual).
- Grid 3 colunas. Tap abre detalhe + atalho para registro de
  origem.
- "Adicionar foto" agora é item do MenuCapturaVerde unificado
  (M34.3); helper `expo-image-picker` continua o motor (M11.1).
- Empty state mantém botão inline "Registrar foto" para
  descoberta.

### 3.3 Marcos
- Lista de marcos manuais + auto-gerados.
- Tags: treino / consistência / emocional / vitória / retomada.
- "Adicionar marco" agora é item do MenuCapturaVerde unificado
  (M34.3); abre `SheetNovoMarco` interno.
- Marcos automáticos (MOB-bridge-3): 5 heurísticas (ex: 7 dias
  seguidos, primeira nota acima de 4) com dedup `sha256`.

### 3.4 Evolução corporal — M11.4 (integração Marcos × Medidas)
- Subseção "Evolução corporal" no topo da aba Marcos: faixa
  horizontal de cards mensais com foto frontal + peso + delta vs
  medida anterior. Tap em um card abre `/medidas` (Tela 13) com
  hint `?focus=YYYY-MM-DD`.
- Subtítulo "Última medida há N dias." em PT-BR (singular para
  hoje/ontem).
- Botão "Registrar evolução" no canto direito do header da seção
  navega direto para `/medidas/novo` (atalho coexiste com FAB
  verde unificado, que mantém "Adicionar marco" como ação
  primária da tab — limite de 1 ação extra por tab no protocolo
  M34.3).
- `MarcoSchema` extendido com `medidaRef?: string` opcional
  (slug `YYYY-MM-DD` em `medidas/`). `SheetNovoMarco` exibe
  bloco "Anexar evolução corporal" listando as 3 medidas mais
  recentes como chips selecionáveis (single, opcional). Marco
  salvo carrega o `medidaRef` no frontmatter quando escolhido.
- Recap (M36) consumirá esse vínculo agregando conquistas
  textuais com snapshots corporais por período.

## 4. Exercícios — M13 (Telas 02, 07, 08)

- Galeria de exercícios cadastrados (CRUD).
- Cadastro: nome + GIF/foto opcional + grupo muscular +
  descrição.
- Detalhe: histórico de uso + estatísticas.

## 4.5 Rotinas de Treino — M-ROTINA-TREINO (proposta)

- Template reutilizável com nome + cor (6 chips Dracula) +
  frequência semanal informativa + lista ordenada de exercícios
  (séries × reps_alvo × carga_kg + observação).
- CRUD em `/rotinas` (lista, novo, detalhe/edição), com **soft
  delete** (arquivar — sessões antigas continuam apontando).
- Selecionável no `SheetNovoTreino` via `<SeletorRotina>` no topo
  do form. Ao escolher, `sessaoFromRotina()` pré-preenche
  exercícios, séries, reps, carga.
- **Snapshot imutável**: editar rotina NÃO afeta sessões já
  registradas. Sessão grava cópia dos campos no momento.
- `exercicio_nome` denormalizado dentro da rotina (cache que
  evita "exercício deletado" → texto vazio).
- Cap 20 exercícios por rotina.
- Persiste em `rotinas/<slug>.md`.
- Item "Rotinas" no MenuLateral seção "Registrar".

## 5. Medidas Corporais — M12 (Telas 12, 13)

- Form: peso, cintura, quadril, peito, braço, coxa, gordura
  corporal.
- Comparativo lado-a-lado (atual vs anterior, delta numérico +
  cor).
- Slider de fotos comparativas (frente / lado / costas).
- Persiste em `medidas/YYYY-MM-DD.md`.
- M11.4 expõe a faixa de evolução também na aba Marcos
  (subseção 3.4) e permite vincular um marco a uma medida via
  `medidaRef` opcional em `MarcoSchema`.

## 6. Mini-painéis de leitura

### 6.1 Mini Humor — M10 (Tela 21)
- Heatmap 13×7 = 91 dias.
- Modo único pessoa_a, único pessoa_b, ou **sobreposto** 50%
  opacity.
- Stats 30d (média, registros, melhor/pior dia).
- Modal detalhe do dia.
- Lê `humor-heatmap.json` gerado pelo backend (cache canônico).

### 6.2 Mini Financeiro — M14 + M35 (Tela 22, **DESLIGADO em v1.0**)
- v1: Hero gasto da semana + top categorias + lista virtualizada
  20 transações.
- v1.0 release: M35 substitui por empty state honesto. Schemas e
  cards preservados como código morto para retomada futura.

## 7. Recap — M36 (proposta)

- 4 seções:
  - **Conquistas** (vitórias do diário + tarefas concluídas).
  - **Crises** (triggers do diário).
  - **Evoluções** (medidas + treinos).
  - **Números** (humor médio, eventos, contadores resetados).
- Períodos: 7 / 30 / 90 dias.
- Push automático ao final de cada período (opt-in).

## 8. Calendário Visual de Conquistas — M11.5 (Tela 25)

- Grid mensal estilo "calendário de heatmap" mas com mídia.
- Cada dia com conquista mostra thumbnail (foto/vídeo) ou ícone.
- Tap abre detalhe + oEmbed inline (Spotify/YouTube).
- Filtros: por tipo / por pessoa / por tag.

## 9. Tela Hoje — M02 → M40 (Tela 01)

### 9.1 v1 (M02)
- Lista do dia: humor + diário + eventos.

### 9.2 v2 — M40 (proposta)
- **Recap** em destaque no topo.
- **Status do casal** — usa campo `para` da M33.
- **Próximos** — alarmes pendentes, tarefas próximas, eventos do
  calendário.

## 10. Opt-ins (toggle on em Settings, default ON)

### 10.1 Acompanhador de Ciclo Menstrual — M14.5

- Calendário mensal com fases (menstrual / folicular / ovulatória
  / lútea).
- Tom sóbrio, sem gamificação.
- Sintomas opcionais.
- Persiste em `ciclo/YYYY-MM-DD.md`.

### 10.2 Alarme Pessoal — F-15 / M16 + M30 v2

- CRUD de alarmes.
- **Recorrência** (M30): única / diária / semanal / mensal.
- Categoria: medicação / treino / outro.
- **Som** CC0: suave / normal / forte.
- **Soneca** configurável.
- **Channel Android v2** com `vibrationPattern: [0,250,500,250]`.
- Notification actions: "Soneca" / "Desligar".
- Migração one-shot lembretes v1 → alarmes pré-cadastrados off
  (M30).

### 10.3 To-do Leve — F-16 / M17 + M31 v2

- CRUD de tarefas.
- **Categoria** (M31): trabalho / casa / rotina / finanças /
  desenvolvimento pessoal / obrigações / saúde / outro.
- **Pessoa destino** (M31): mim / outra / casal / terceiro (com
  nome).
- **Alarme vinculado** opcional (cria companion em
  `alarmes/<slug>-alarme.md`).
- Drag & drop reordering.
- Busca por título.
- **Aba Concluídas** collapsable (default colapsada se >5 itens).
- **Long-press em concluída**: Reabrir / Apagar definitivo.
- Lixeira soft (apagar não é definitivo até 30 dias).

### 10.4 Contador "Dias sem X" — F-17 / M18 + M32 v2

- CRUD de contadores.
- Reset preserva histórico (recorde + lista de resets).
- **Mensagens de apoio** sóbrias (M32) em 6 faixas: 0 / <5 / <30
  / <100 / <365 / ≥365 dias.
- **Indicador de marcos** discreto: 5d / 30d / 100d / 365d
  (cinza-violeta 11dp letter-spacing 1, sem cor de festa).
- Campo `para` (M33).

## 11. Configurações — M15 + M29

- **Som e vibração** (M29 v2): mestre `geral` + 3 contextuais
  (`despertar` / `conquista` / `botões`). Geral off silencia tudo.
- **Pessoa**: vault compartilhado on/off, editar nomes/fotos,
  reinicializar pasta do Vault, adicionar segunda pessoa.
- **Opcionais**: 6 toggles default ON.
- **Privacidade**: biometria ao abrir / ocultar transcrições /
  `widgetMostraNome` (off por default).
- **Mídia**: cap por registro (default 4), permitir áudio.
- **Dados**:
  - **Exportar todos os meus dados** (M15 + M-EXPORT-COMPLETO): gera
    ZIP no `cacheDirectory` com todos os `.md` recursivos das 19
    subpastas canônicas, todos os binários (jpg/m4a/mp4/pdf) com
    bytes preservados, todos os companion `.md` (M34/M39), o cache
    `.ouroboros/cache/*.json` e um snapshot `snapshot-settings.json`
    com `useSettings` + `useOnboarding` + `usePessoa`. Manifest
    `MANIFEST.json` na raiz lista cada arquivo com sha256 para
    verificação no restore.
  - **Importar backup** (M-EXPORT-COMPLETO): document picker para
    `.zip`, valida cada arquivo via sha256 do MANIFEST antes de
    escrever, restore default não-destrutivo em
    `restaurado-<YYYY-MM-DD>/` (sobrescrever o Vault existente exige
    confirmação explícita do usuário). Schema versionado
    (`EXPORT_SCHEMA_VERSION = 1`).
  - **Limpar cache local**: remove `ouroboros-export-*.zip` do
    cacheDirectory (M15).
- **Sobre**: versão, contribuidores anônimos, ADRs.

## 12. Widget Homescreen Android — M20 (Tela 26)

- Módulo Expo nativo (Glance JetPack).
- 2 layouts: 4×2 (compacto) e 4×4 (expandido).
- Mostra humor do dia + nome (configurável via
  `widgetMostraNome` toggle) + 1 alarme próximo.
- Bridge JS → atualizar widget ao registrar humor.

## 13. Calendário Google — M37.1 + M37.2 (PAUSA usuário)

- OAuth via expo-auth-session com clientId Expo Go vs
  dev-client/release split.
- **Leitura** (M37.1): rota `/agenda` mostra eventos do mês.
- **Escrita** (M37.2): criar / atualizar / deletar evento.
- Cache local de 7 dias.
- Escopo mínimo `https://www.googleapis.com/auth/calendar.events`.

## 14. Compartilhamento via Syncthing — M38 (4 dispositivos)

- Conflict resolution via `deviceId` no slug do arquivo
  (`<data>-<slug>-<deviceId>.md`).
- Suporta até 4 dispositivos pareados.
- Política Last-Write-Wins por timestamp + manual merge para
  campos específicos.
- Status do sync no Settings (não roda nada — Syncthing é
  externo).

## 15. Estrutura de mídia — M39 (formaliza ADR-0017)

- Pasta canônica `media/<categoria>/<data-rand>.<ext>`.
- Categorias: `fotos` / `audios` / `videos` / `frases` / `scanner`
  (PDFs multipágina, A3.x.4) / `avatares` (sem companion, exceção
  ADR-0017).
- **Companion `.md`** sempre acompanha o binário, com YAML
  frontmatter:
  - `tipo` (`midia_foto` / `midia_audio` / `midia_video` /
    `midia_frase` / `midia_pdf`)
  - `arquivo` (basename do binário)
  - `data` (ISO datetime)
  - `autor` (`pessoa_a` / `pessoa_b`)
  - `para` (`mim` / `outra:pessoa_<a|b>` / `casal`)
  - `legenda` (opcional, texto livre)
  - `transcricao` (opcional, áudio)
  - `duracao_seg` (opcional, áudio/vídeo)
  - `medida_ref` (opcional, reverse-link para `medidas/YYYY-MM-DD.md`)
  - `origem` / `origem_ref` (opcionais, schema-mãe que originou o
    binário — ex: `evento`, `diario_emocional`)
- **Schema zod canônico:** `MidiaCompanionSchema` em
  `src/lib/schemas/midia-companion.ts` (M39, ADR-0017). Reexportado
  no barrel `src/lib/schemas/index.ts`.
- **Helpers canônicos** em `src/lib/vault/midiaCompanion.ts` (M39):
  - `escreverMidiaComCompanion(vaultRoot, binarioUri, meta)` —
    grava par binário + companion `.md` 1:1, idempotente (não
    sobrescreve se basename já existe).
  - `lerCompanion(vaultRoot, binarioPath)` — lê e valida companion
    via zod; retorna `null` quando ausente ou inválido.
  - `migrarAssetsLegacyParaMedia(vaultRoot)` — varre `assets/` e
    move binários legados para `media/<categoria>/`. Idempotente.
    Plugado em `BOOT_HOOKS` (roda uma vez por boot).
- **Serializador determinístico legado** em
  `src/lib/midia/companion.ts` (M34 + extensões A3.x.3 / A3.x.4)
  permanece como fonte do `.md` de saída — mantém ordem de chaves
  e escape de aspas para snapshot tests. M39 reaproveita
  internamente; consumidores existentes continuam funcionando sem
  mudança de comportamento.
- **Migração de writers para o helper canônico:** entrega
  incremental. M39 entrega schema + helpers + boot hook + testes;
  migração dos 9 writers existentes (`capturarFoto`,
  `capturarMusica`, `capturarVideo`, `salvarFrase`, `recordAudio`,
  `saveEvento.copiarFotos`, `medidas/novo`, `scanner/saveNota`,
  `adicionarFotoManual`) fica para M39.1 dedicada (escopo
  controlado, anti-débito).

## 16. Vault físico

- **Desktop:** `~/Protocolo-Ouroboros/`
- **Android:** `/sdcard/Documents/Ouroboros/`
- **Sync:** Syncthing (P2P, sem servidor central).

### Estrutura canônica

```
daily/YYYY-MM-DD.md                    # humor
diario/YYYY-MM-DD/<slug>.md            # diário emocional
eventos/YYYY-MM-DD/<slug>.md
treinos/YYYY-MM-DD/<slug>.md
marcos/<slug>.md
medidas/YYYY-MM-DD.md
tarefas/<slug>.md
alarmes/<slug>.md
contadores/<slug>.md
ciclo/YYYY-MM-DD.md
financas/notas/YYYY-MM-DD-<slug>.md
exercicios/<slug>.md
inbox/<data>-<slug>.md                 # share intent
media/<categoria>/<arquivo>            # binário + companion
.ouroboros/cache/                      # gerados pelo backend
  humor-heatmap.json
  financas-cache.json
```

## 17. Schemas YAML canônicos (19 ativos)

| Schema | Sprint origem | Path típico |
|---|---|---|
| `alarme` | M16 + M30 v2 | `alarmes/<slug>.md` |
| `ciclo_menstrual` | M14.5 | `ciclo/YYYY-MM-DD.md` |
| `contador` | M18 + M32 + M33 | `contadores/<slug>.md` |
| `diario_emocional` | M06 + M33 | `diario/YYYY-MM-DD/<slug>.md` |
| `evento` | M07 + M33 | `eventos/YYYY-MM-DD/<slug>.md` |
| `exercicio` | M13 | `exercicios/<slug>.md` |
| `financas-cache` | M14 (backend) | `.ouroboros/cache/financas-cache.json` |
| `financeiro_nota` | M09 | `financas/notas/YYYY-MM-DD-<slug>.md` |
| `humor` | M05 | `daily/YYYY-MM-DD.md` |
| `humor_heatmap_cache` | M10 (backend) | `.ouroboros/cache/humor-heatmap.json` |
| `inbox_arquivo` | M08 | `inbox/<data>-<slug>.md` |
| `marco` | M11 + M33 | `marcos/<slug>.md` |
| `medidas` | M12 | `medidas/YYYY-MM-DD.md` |
| `midia` | M07.x + M34 + M39 | companion de binários |
| `para` (componente) | M33 | discriminatedUnion compartilhada |
| `pessoa` | M03 + M28 | SecureStore |
| `rotina` | M-ROTINA-TREINO (proposta) | `rotinas/<slug>.md` |
| `tarefa` | M17 + M31 v2 | `tarefas/<slug>.md` |
| `treino_sessao` | M11 | `treinos/YYYY-MM-DD/<slug>.md` (com `rotina_slug` opcional pós-M-ROTINA-TREINO) |

## 18. Princípios invioláveis

- **Anonimato absoluto** (Regra −1) — zero IA, zero autoria, zero
  nomes reais hardcoded.
- **Privacidade por design** — nada na nuvem (exceto Google
  Calendar opt-in com escopo mínimo).
- **Vault local** — sincronização via Syncthing P2P.
- **PT-BR sentence case + acentuação completa** em UI.
- **Estética Dracula** — paleta hex fixa.
- **JetBrains Mono** font única, pesos 400/500.
- **ADR-0010** — física acima de tempo, silêncio visual,
  hierarquia por contraste.
- **ADR-0005** — zero gamificação.
- **Sem APIs pagas** (ADR-0007).

## 19. Implicações para a versão desktop

A versão desktop pode reusar **schemas + Vault físico + helpers
de leitura** quase 1:1 (são plain MD/JSON). Pontos de divergência
natural:

| Feature | Mobile | Desktop equivalente |
|---|---|---|
| Captura ativa (humor/diário/evento) | Sheets nativos + ImagePicker | Modal HTML + drag&drop file API |
| Share Intent (M08) | Android share intent | **Inbox de arquivos** robusto: drag&drop, file picker batch, watch folder |
| Microfone (M06.5) | `expo-speech-recognition` on-device | Web Audio API + Whisper local (privacidade) |
| Scanner OCR (M09) | ML Kit nativo | Tesseract local ou wrapper ML Kit |
| Calendário Google (M37) | expo-auth-session redirect | OAuth via redirect URI customizado (mesmo escopo) |
| Widget homescreen (M20) | Glance JetPack | **Tray icon** com mini-painel + notificação desktop |
| Recap/heatmaps/galerias | RN componentes | Telas frias, fáceis de portar (HTML/CSS) |
| Backend Python | repo paralelo `protocolo-ouroboros` | Mesmo backend, mesmos caches |

## 20. Como manter este arquivo

1. Toda spec nova adiciona checklist em §8 (Checkpoint visual):
   - [ ] `docs/FEATURES-CANONICAS.md` atualizado.
2. Sprint corretiva pequena (`M<NN>.<x>`): atualizar apenas se
   muda comportamento visível ao usuário.
3. Sprint de schema (mudança em `src/lib/schemas/`): atualizar §17.
4. Sprint que cria/remove rota: atualizar §1-15 conforme.
5. ADR novo: atualizar §18.
6. Validador-sprint **recusa** sprint sem este check em §8.

## Referências cruzadas

- `STATE.md` — onde estamos agora.
- `ROADMAP.md` — fila de execução priorizada.
- `CLAUDE.md` — regras invioláveis.
- `VALIDATOR_BRIEF.md` — invariantes do projeto.
- `HOW_TO_RESUME.md` — guia de retomada em sessão fresh.
- `docs/BRIEFING.md` — design system + 24 telas + schemas YAML
  detalhados.
- `docs/CONTEXTO.md` — ecossistema de duas pessoas + contrato
  Mobile↔Backend.
- `docs/ADRs/INDEX.md` — decisões arquiteturais formalizadas.
- `docs/GAUNTLET.md` — validação visual via Gauntlet.
