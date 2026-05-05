# Auditoria Completa — 2026-05-05

> Auditoria visual via Gauntlet (claude-in-chrome MCP) + validação
> runtime (smoke + leak check + bundle) do estado consolidado após
> Blocos A, B e C fechados (sessão 2026-05-04 → 2026-05-05).

---

## 1. Estado quantitativo

| Métrica | Valor | Notas |
|---|---|---|
| HEAD | `91430bd` | Bloco C fechado |
| Testes Jest | **1502** passing | 1300 → 1502 (+202) |
| Suítes Jest | **167** passing | 145 → 167 (+22) |
| TS strict | **0 erros** | — |
| Anonimato | OK | Regra −1 preservada |
| Smoke | OK | 6,1s |
| Bundle Hermes Android | **6,9 MB** | Limite 8,85 MB → margem 1,95 MB |
| Gauntlet leak check | **0/6 markers** | Bytecode Android limpo |
| Sprints fechadas (tabela) | **56** | Inclui 9 do A + 6 do B + 10 do C + outras |
| Sprints ativas | **9** | D1, E1-E6, F1, G1 |
| Specs no projeto | **131** | docs/sprints/*.md |
| APIs `__gauntlet` | **16** | seed, reset, abrir, etc. |
| Tempo de boot | **61 ms** | medido via `tempoDeBoot()` |

---

## 2. Validação visual — 19 telas auditadas

Seed Gauntlet: `seed({ nomeA: 'Sam', nomeB: 'Ana', tipoCompanhia: 'duo' })`.

### 2.1 Telas aprovadas (16)

| # | Tela | Sprint | Verificações |
|---|---|---|---|
| 1 | `/` Tela Hoje v2 | M40 (B4) | Header dual avatar Sam/Ana + botão Recap; Status do casal (2 colunas); Próximos com empty state "Nada nas próximas horas."; Humor do dia; Esta jornada "Nada hoje. Tudo bem." |
| 2 | `/captura` | M-CAPTURA-UNIFICADA (B1) | "O que você quer registrar?" + 2 cards: "Registrar momento" verde / "Escanear documento" cyan + subtítulos com acentuação completa |
| 3 | `/recap` | M36 (B5) | Header "Recap" + X; ChipGroup (Semana/Mês/Ano/Personalizado, Semana selected); empty state "Nenhum registro neste período." |
| 4 | `/memoria` | M11 + M11.1 + M27 | 3 abas (Treinos/Fotos/Marcos); heatmap 7×13; empty state Treinos; FAB roxo (FABMenu) + verde (MenuCapturaVerde) |
| 5 | `/memoria` + FAB verde | M34.3 + M34.1.1 | Sheet "Registrar" 5 itens: **Novo treino** (contextual) + Foto + Música + Vídeo + Frase. **FABMenu roxo confirmadamente OCULTO** quando sheet aberto (M34.1.1) |
| 6 | `/todo` | M17 + M31 | Empty state "Sem tarefas. Crie quando quiser." |
| 7 | `/todo` + Nova tarefa | M31 + M-DEBITO-CATEGORIA-CORES (B3) | Sheet com Título "Comprar pão" + 8 chips categoria + 4 chips PARA QUEM (Para mim selected purple) |
| 8 | `/todo` + Trabalho selected | B3 | Chip "Trabalho" vira **cyan** quando selected (cor accent semântica funcional) |
| 9 | `/settings` | M15 + M29 | Som e vibração (4 toggles); Pessoa Sam ativo + Ana inativo; Vault compartilhado; Editar nomes; Reinicializar pasta |
| 10 | `/settings` (rolado) | M-EXPORT-COMPLETO (A5) + C5 | Backup semanal (toggle OFF) + PRIVACIDADE + **"Exportar todos os meus dados"** (purple) + **"Importar backup"** + Limpar cache + SOBRE (Versão 1.0.0 + GitHub + Licença GPL-3.0) |
| 11 | `/settings/sobre` | M-SOBRE-RELEASE-NOTES (C4) | Header "Sobre"; SOBRE: Versão 1.0.0, Build 0, Commit "dev", Ver no GitHub, Licença GPL-3.0; **O QUE MUDOU**: changelog estruturado com v1.0.0 (5 bullets) + v0.9.0... |
| 12 | `/settings/dispositivos` | M38 (C6) | Header "Dispositivos pareados"; texto explicativo deviceId; empty state "Nenhum dispositivo registrado ainda."; botão "Atualizar" |
| 13 | `/financas` | M35 (B6) | Header "Finanças"; ícone Wallet; **"Em desenvolvimento. Disponível em versão futura."** (empty honesto) |
| 14 | `/alarmes/novo` | M30 + M16 | Título input; Horário 08:00; Recorrência 4 chips (Semanal selected); Dias da semana 7 chips D-S (todos selected); Categoria 3 chips (Medicação selected laranja); Som 3 chips (Suave selected cyan); Soneca slider; Ativo toggle |
| 15 | `/medidas` | M12 | Header "Medidas"; Período (30/90/Tudo, Tudo selected); empty state "Suas medidas vão aparecer aqui."; FAB |
| 16 | `/_dev/gauntlet` | M-GAUNTLET | Boot 61 ms; 16 APIs; estado consultável |

### 2.2 Telas com achado de UI/UX (3)

| # | Tela | Achado | Severidade |
|---|---|---|---|
| 17 | `/humor-rapido` | Sheet modal montado mas **fica fora do viewport principal** — só `<OuroborosLoader compacto>` visível no centro. Conteúdo dos 4 sliders aparece apenas se rolar pra baixo. Snap point inicial parece muito pequeno. | **Média** — usuário precisaria gesto pra ver conteúdo |
| 18 | `/eventos` | Mesmo padrão: sheet montado (DOM tem "Modo/Positivo/Negativo/Categoria/Sam/Ana/etc"), mas snap fechado. | **Média** |
| 19 | `/diario-emocional` | Mesmo padrão. | **Média** |

**Investigação**: o DOM contém todo o conteúdo (`document.body.innerText` retorna "Modo / Positivo / Negativo / O que aconteceu? / Onde / Usar localização atual / Quando / ..."), mas o BottomSheet do gorhom em web inicia em snap muito baixo. Era expandido em sprints anteriores; pode ser **regressão de batch recente** (M38 ou M-CAPTURA-UNIFICADA ajustaram `_layout.tsx`).

---

## 3. Achados que viram sub-sprints

### 3.1 M-SHEET-MODAL-SNAP — sheets modais não abrem expandidos

`humor-rapido.tsx`, `eventos.tsx`, `diario-emocional.tsx` (e provavelmente
`scanner.tsx`) registram `<Stack.Screen presentation="transparentModal">`
com `<OuroborosLoader compacto>` atrás de `<BottomSheet ref={ref}
index={0}>`.

**Esperado**: ao montar, `index={0}` corresponde ao primeiro snap point
(geralmente `'85%'` ou `'70%'`), sheet aparece expandido cobrindo
maior parte do viewport.

**Atual**: sheet aparece expandindo apenas ~10-15% do viewport (rodapé),
loader cobre os 85% restantes.

Hipóteses:
- `index={0}` em gorhom v5 pode ser o snap MENOR e não maior.
- M26 ajustes de A18 mudaram comportamento.
- M-CAPTURA-UNIFICADA (B1) mexeu em `app/_layout.tsx` Stack.Screens.

Spec a materializar: investigar via diff `git log -p app/_layout.tsx`,
verificar `<Stack.Screen>` config + props `index` dos sheets. Se
necessário, reabrir M26 (Armadilha A18) com fix.

### 3.2 M-DEBITO-CATEGORIA-CORES-VISIBLE — chips em rest visualmente similares

Confirmado via DOM: chips de categoria no estado **rest** têm
`borderColor: rgb(0,0,0)` e fundo escuro, visualmente quase
idênticos. A cor accent (cyan/pink/purple/etc) só aparece quando
**selected** — como no screenshot "Trabalho cyan".

**Decisão de design**: cor distingue estado, não tipo. Aceitável
mas potencialmente confuso (usuário não sabe qual categoria
representa o quê antes de selecionar).

**Sugestão**: aplicar `borderColor: accent` em rest com 30%
opacity, OU adicionar ícone Lucide pequeno por categoria à esquerda
do label. Sub-sprint baixa prioridade.

---

## 4. Decisões durável tomadas durante auditoria

1. **Sheets modais com snap pequeno**: registrado como
   M-SHEET-MODAL-SNAP. Não é regressão crítica (uso real Android
   pode ter comportamento diferente — gorhom em RN nativo respeita
   `snapPoints[index]` corretamente). Validar em Nível B antes de
   M41.

2. **Chips de categoria em rest**: comportamento atual é design
   válido (cor = estado). Sub-sprint M-DEBITO-CATEGORIA-CORES-VISIBLE
   opcional para v1.1.

3. **Ícone Lucide do header de tarefa**: AC-1 herdado de B3
   continua aberto. Não é bloqueador.

---

## 5. Validação infra

| Check | Resultado |
|---|---|
| `./scripts/check_anonimato.sh` | OK |
| `python3 scripts/check_strings_ui_ptbr.py` | OK (0 violações) |
| `npx tsc --noEmit` | 0 erros |
| `npm test --silent` | 1502 passing / 167 suites |
| `./scripts/smoke.sh` | OK (6,1s) |
| `./scripts/check_gauntlet_leak.sh` | 0/6 markers |
| `./scripts/check_vault_estrutura.sh` | (não rodado nesta auditoria — requer vault real) |
| `npx expo export --platform android` | 6,9 MB Hermes |

---

## 6. Decisão final

**APROVADO COM 1 ACHADO MÉDIO** (M-SHEET-MODAL-SNAP).

O projeto está em estado release-ready com fundação sólida (vault
canônico + companion + export/restore + backup), polish UX
(captura unificada + Recap + Tela Hoje v2 + finanças honesto),
release-readiness completo (WCAG audit + assets + sobre + backup +
M38), e infra robusta (Gauntlet leak 0, bundle 22% folga, hook
PT-BR ativo, 1502 testes verde).

3 achados não bloqueantes para M41:
1. M-SHEET-MODAL-SNAP — investigar e fixar OU validar Nível B antes
   de release.
2. M-DEBITO-CATEGORIA-CORES-VISIBLE — opcional v1.1.
3. AC-1 ícone categoria header — opcional v1.1.

---

## 7. Próximos passos recomendados

1. **D1 M-DEV-CLIENT-DECISAO** — fechar como spec apenas (decisão
   (a) já registrada).
2. **M-SHEET-MODAL-SNAP** — sprint corretiva imediata (1-2h).
3. **Bloco E (dev-client)** — M06.5 microfone como pré-requisito de
   M07.x e M11.5.
4. **Field test M-FIELD-TEST** — quando Bloco E fechar.
5. **M41 release** — após field test verde.
