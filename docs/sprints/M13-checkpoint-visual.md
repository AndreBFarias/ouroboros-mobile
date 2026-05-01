# Sprint M13 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (a4dc9ecb95b0dea01)
ORQUESTRADOR: Claude principal (validação cruzada via claude-in-chrome MCP, mínima)
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless 412x900)

8 screenshots capturados:

| Path | sha256 (10) | Estado |
|---|---|---|
| `A-01-galeria-vazia.png` | `e6ab0a1e..` | Tela 07 estado vazio. Header laranja "Galeria", ChipGroup grupo muscular (8 chips Sentence case acentuados — Bíceps/Tríceps), input "Buscar por nome", FAB roxo |
| `A-02-galeria-com-filtros.png` | `4b5cb46d..` | Filtros ativos: chip "Pernas" preenchido roxo Dracula, search "agachamento", empty state contextual "Nenhum exercício corresponde ao filtro." |
| `A-03-detalhe-not-found.png` | `972de16f..` | Tela 08 com slug ausente. Empty state Dumbbell + "Exercício não encontrado. Talvez tenha sido excluído." |
| `A-04-cadastro-novo.png` | `f2eb4739..` | Tela 02 vazia. Header "Novo exercício", labels NÍVEL/GRUPO MUSCULAR, ChipGroups, Equipamento, Instrução, "Dicas (opcional)" + "Adicionar dica" |
| `A-04b-cadastro-preenchido.png` | `f4c25fe1..` | Form preenchido: "Agachamento livre", Pernas+Core, Intermediário em yellow, instrução acentuada "desça até as coxas ficarem paralelas ao chão e suba." |
| `A-05-edicao-not-found.png` | `c19c2e87..` | Header "Editar exercício" com empty state |
| `A-06-modal-excluir-mockup.png` | `4c274440..` | Modal destrutivo "Excluir exercício?" + "O arquivo será movido para a lixeira. Você pode recuperá-lo manualmente em até 30 dias." Botões Confirmar exclusão (red) + Cancelar (ghost) |
| `A-07-fab-radial-aberto.png` | `e06903ae..` | Tela 01 Hoje + FAB visível — confirma sub-rota M13 não causa crash no app |

## Camada V — Validação cruzada via claude-in-chrome MCP

Validação V mínima nesta sprint: o agente já capturou em viewport
mobile (412x900) correto via playwright headless. Como Vault em web
é mock localStorage (SAF não disponível), galeria com cards reais
e fluxos de save/excluir só rodam em Nível B/C. Aceito a Camada A
como suficiente.

Via Chrome MCP: confirmação de que `/(tabs)/exercicios/novo`
está acessível (aba registrada em `(tabs)/_layout.tsx` com `href: null`)
e que `app/em-breve.tsx` foi removido sem crash do app.

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       437 passing (54 suites)  [+61 vs baseline 376]
smoke.sh:     OK
expo export:  ~7.66 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Sub-rotas `app/(tabs)/exercicios/{index,[slug],novo,[slug]/editar}` registradas via `_layout.tsx` próprio
- [ok] Schema `ExercicioSchema` exportado via barrel
- [ok] Plugin `expo-document-picker` em `app.json`
- [ok] FAB exercício em `captureRoutes.ts` aponta `/(tabs)/exercicios/novo`
- [ok] `app/em-breve.tsx` REMOVIDO
- [ok] `(tabs)/_layout.tsx` registra `exercicios` com `href: null` (acesso via FAB ou deep link)

## Decisões implementadas (spec §10)

- [ok] CRUD completo (Tela 02 cadastro/edição, Editar via long-press, Excluir lixeira soft, "Adicionar a treino livre")
- [ok] Placeholder GIF ausente: Dumbbell muted-decor 48dp + "Sem mídia"
- [ok] Sparkline tooltip cyan ao tap (auto-dismiss 2s)
- [ok] Lixeira soft `cacheDirectory/lixeira/exercicios/<timestamp>-<slug>.md`
- [ok] GIF picker via `expo-document-picker` com validação `image/gif` + cap 5MB
- [ok] "Adicionar a treino livre" cria draft em `treinos/draft/YYYY-MM-DD-<slug>.md` (sem TreinoSessaoSchema — fica para M11)

## Achados colaterais

Nenhum bug pré-existente. Hipótese divergente registrada (não impacta resultado): brief mencionava substituir `app/(tabs)/exercicios.tsx` redirect-stub criado em M00.5; esse arquivo nunca existiu (M00.5 não criou aba `exercicios` por padrão), então o agente criou diretamente o sub-diretório `app/(tabs)/exercicios/` com `_layout.tsx` próprio. Resultado equivalente ao pretendido.

## Decisão final

**APROVADO.** M13 entrega CRUD completo de exercícios + Tela 02 + galeria + detalhe + atualizações cruzadas (captureRoutes, em-breve removido). M11 desbloqueada (consome ChipGroup de exercícios).

**Próxima sprint executável:** [M11 — Memórias e Marcos](M11-spec.md).
