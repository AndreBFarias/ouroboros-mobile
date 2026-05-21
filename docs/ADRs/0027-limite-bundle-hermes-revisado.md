# ADR 0027 — Limite de bundle Hermes revisado (10,5 MB)

```
Status:     Aceito
Data:       2026-05-21
Sprint:     R-ADR-LIMITE-BUNDLE-V2 (Onda 3M, achado da audit R-BUNDLE-SIZE-AUDIT)
Depende:    ADR-0006 (Stack Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui)
            ADR-0010 (Estética como fundação, não polimento)
```

## Contexto

O bundle Hermes Android cresceu **+44,5% em 17 dias** entre as duas
auditorias formais de tamanho:

| Marco | Data | Bundle Hermes Android | Delta acumulado |
|---|---|---|---|
| M-BUNDLE-DIET (linha base) | 2026-05-04 | 7.084.361 B (7,08 MB) | — |
| R-BUNDLE-SIZE-AUDIT (atual) | 2026-05-21 | 10.233.199 B (10,23 MB) | **+3.148.838 B (+44,5%)** |

O limite documentado historicamente em `STATE.md`, `docs/BRIEFING.md`
e vários `CHANGELOG.md` entries era **8,55 MB (meta) / 8,85 MB (teto
informal)**. Esse número foi fixado em M-BUNDLE-DIET (2026-05-04) com
base no estado pós-diet daquele momento mais ~25% de folga. O bundle
atual excede esse teto em ~1,4 MB.

### O crescimento é legítimo

A auditoria `R-BUNDLE-SIZE-AUDIT`
(`docs/auditoria-bundle-2026-05-21/RELATORIO.md`) descartou regressão
acidental. O leak check do gauntlet permanece **0/6** (nenhum marker
de dev infiltrado no bundle release). A origem do crescimento é
trabalho legítimo entregue entre M-BUNDLE-DIET e hoje:

| Feature / sprint | Pacote ou área | Peso raw (KB) | Status |
|---|---|---|---|
| Tree-shake regressão de `lucide-react-native` | `lucide-react-native` | +1305 | Será corrigido em R-BUNDLE-LUCIDE-RESHIM (−650 KB Hermes) |
| Agenda calendário M37 | `react-native-calendars` + transitivas | +1252 | Aceito (feature canônica) |
| App code Onda Q/R/3J/3K | `src/` + `app/` | +500 (estimado) | Aceito (features v1.0) |
| Integrações R-INT | `expo-share-intent`, `expo-speech-recognition`, `expo-auth-session` | +128 | Aceito |
| Health Connect (R-INT-3) | `react-native-health-connect` | +20 JS | Aceito |

A audit identificou um único bypass do shim canônico
`@/lib/icons` em `app/index.tsx:29` (import direto de `Sparkles` de
`lucide-react-native`), que será endereçado na sprint
`R-BUNDLE-LUCIDE-RESHIM` separada. Após esse fix cirúrgico, o bundle
projetado cai para **~9,58 MB** — ainda acima do teto antigo, mas
estável dentro do novo limite proposto neste ADR.

### A decisão necessária

Sem ADR documentando um teto revisado oficial, a sprint `M41`
(release v1.0.0) ficaria bloqueada por argumento de "bundle excede o
limite documentado", mesmo que o crescimento seja resultado de
features canônicas da v1.0. As opções analisadas foram:

- **Cortar features** para voltar a 8,85 MB. Custo: meses de
  reescrita, perda de feature canônica (calendário, Health Connect),
  contradiz `ROADMAP.md` Onda Q+R.
- **Adiar a decisão para v1.1.** Custo: gating contínuo do M41,
  débito documental se acumula.
- **Revisar o limite via ADR com justificativa explícita e
  monitoria contínua.** Custo: APK final maior por ~3 MB; tempo de
  download +1s em LTE típico; parse Hermes inicial +200 ms estimado.

## Decisão

Adotar **10,5 MB** (10.500.000 bytes de Hermes bytecode Android) como
limite oficial do bundle a partir desta sprint, substituindo a
referência informal a 8,55–8,85 MB usada em docs históricos.

1. **Métrica canônica:** tamanho em bytes do arquivo `.hbc` produzido
   por `npx expo export --platform android` sem source-maps. Medição
   via `stat` em `_expo/static/js/android/entry-*.hbc`.
2. **Teto duro:** 10.500.000 bytes (10,5 MB). Bundle que ultrapasse
   esse valor não pode ser publicado em release; precisa de sprint
   de diet ou ADR substituidora.
3. **Faixa de monitoria:** ≥ 95 % do limite (`≥ 9.975.000 B`)
   dispara `R-BUNDLE-DIET-*` antes da próxima release.
4. **Métrica em CI / sanity:** `R-BUNDLE-SIZE-AUDIT` é
   pré-requisito de qualquer release (`M41` para v1.0.0 e
   subsequentes). O agente roda `expo export`, mede o `.hbc`, compara
   contra o teto, e reprova se excedido.
5. **Trade-off aceito:** APK final maior por ~3 MB; tempo de download
   +1 s em LTE típico; parse Hermes inicial +200 ms (custo único de
   boot pós-instalação). Tolerável dado o ganho de manter features
   canônicas.

### Caminho até o limite efetivo de v1.0

A audit propôs o seguinte plano de pré-release, parcialmente
absorvido por esta ADR:

| Sprint | Tipo | Ganho esperado | Estado |
|---|---|---|---|
| `R-BUNDLE-LUCIDE-RESHIM` | Fix cirúrgico | −650 KB Hermes | Pré-requisito do M41 |
| `R-ADR-LIMITE-BUNDLE-V2` | ADR (este) | 0 KB (doc) | Esta sprint |
| `R-BUNDLE-DIET-CALENDARS-REPLACE` | Refactor | −500 KB Hermes | Descopada para v1.1 |
| `R-BUNDLE-LODASH-PATCH` | Patch transitivo | −400 KB Hermes | Descopada para v1.1 |

Após `R-BUNDLE-LUCIDE-RESHIM`, o estado projetado é **~9,58 MB**
(91 % do limite, 920 KB de folga). Essa folga acomoda M41 + as
features pequenas previstas para a v1.0 sem reaproximar o teto.

## Justificativa

### Features que justificam o crescimento

O delta `+3,15 MB` raw / `+650 KB Hermes (líquidos pós-reshim)`
distribui-se assim, conforme tabela "Comparativo com M-BUNDLE-DIET"
do relatório de audit:

- **Agenda calendário (M37):** `react-native-calendars` 219 KB +
  transitivas (`lodash` 704 KB + `moment` 172 KB +
  `recyclerlistview` 137 KB + `xdate` 20 KB) = **1.252 KB raw**.
  Calendário é feature canônica do app (visualização modo calendário
  de Recap, agenda de eventos pessoa_a/pessoa_b). ADR-0021 já
  consolidou Recap + Calendário em uma única tela.
- **App code Onda Q/R/3J/3K:** `src/` + `app/` somam **2.109 KB**
  agora, contra estimativa anterior em ~1.600 KB. Crescimento de
  ~500 KB cobre: OAuth Google (Onda Q `R-INT-1/2`), Vault canonical
  com schemas + stats + ZIP exportar (Onda R `R-VAULT-CANONICAL`),
  share intent + transcrição (Q22.\*), slideshow + Ken Burns + share
  PNG (R-RECAP-4/5/6), autoplay áudio (R-MEDIA-2), backup automático
  com jszip (R-BACKUP-AUTO), refactors estruturais Onda 3J/3K.
- **Integrações (R-INT):** `expo-share-intent` + `expo-speech-recognition`
  + `expo-auth-session` somam ~128 KB JS combinados. Habilitam share
  intent multi-app, transcrição de áudio para texto e OAuth canônico
  para Spotify/YouTube.
- **Health Connect (R-INT-3):** `react-native-health-connect` 20 KB
  JS (peso maior está no nativo `.so`, fora do escopo desta audit
  Android JS bundle).
- **Tree-shake regressão de `lucide-react-native`:** +1.305 KB raw
  por um único import direto (`app/index.tsx:29`) que escapa o shim
  `@/lib/icons`. Endereçado em `R-BUNDLE-LUCIDE-RESHIM` (sprint
  pré-requisito do M41).

### Por que 10,5 MB e não outro valor

Três opções foram avaliadas:

- **9,8 MB (`du -sh` arredondado).** Folga negativa: bundle atual
  10,23 MB excede esse teto. Forçaria diet antes de M41.
- **10,3 MB (bundle atual arredondado).** Folga zero: qualquer ajuste
  futuro estouraria o teto. Inviável.
- **10,5 MB (escolhido).** Folga de ~3 % sobre `10,23 MB`, ou ~9,2 %
  sobre o estado projetado pós-reshim de `9,58 MB`. Acomoda M41 e as
  features pequenas previstas para v1.0 (settings polish, telas
  remanescentes da Onda 4) sem forçar uma sprint de diet emergencial.
- **11 MB ou mais.** Folga excessiva (~14 %). Sem pressão para
  manter o bundle enxuto, o crescimento acelera sem controle.

`10,5 MB` é o ponto que equilibra "destrava M41" com "preserva
pressão de monitoria contínua".

## Consequências

### Positivas

- **Release v1.0 destravado** sem cortar features canônicas. M41
  pode prosseguir com a base atual + R-BUNDLE-LUCIDE-RESHIM.
- **Limite documentado oficialmente** elimina ambiguidade entre
  docs históricos (BRIEFING, CHANGELOG entries) que mencionavam
  `8,55 MB` / `8,85 MB` como teto. Validador-sprint passa a citar
  ADR-0027 como referência única.
- **Monitoria contínua institucionalizada:** `R-BUNDLE-SIZE-AUDIT`
  vira pré-requisito de qualquer release. Crescimentos futuros são
  detectados antes de virar bloqueador.
- **Folga preserva pressão:** o teto de 10,5 MB cobre o estado
  projetado pós-reshim (~9,58 MB) com folga útil, mas não tanta
  quanto para esconder regressões. Atingir 95 % (9,98 MB) dispara
  sprint de diet automaticamente.

### Negativas

- **APK final maior por ~3 MB** comparado ao estado de
  M-BUNDLE-DIET. Download em LTE típico (~5 MB/s real) custa +1 s.
  Parse Hermes inicial estimado em +200 ms no boot pós-instalação
  (custo único, não recorrente).
- **`react-native-calendars` carrega transitivas pesadas** (`lodash`
  704 KB, `moment` 172 KB). A v1.1 deve avaliar substituição
  (sprint `R-BUNDLE-DIET-CALENDARS-REPLACE`, descopada).
- **Decisão revisada implicitamente do ADR-0006**, que mencionava
  "Bundle 4-6 MB maior que nativo — irrelevante em 2026" como
  consequência tolerável. O bundle Hermes Android sozinho (sem
  `.so` nativos, recursos, etc.) agora está em 10 MB, então o "4-6
  MB a mais que nativo" passa a ser "8-10 MB a mais que nativo".
  ADR-0006 não é substituida; apenas calibrada por este ADR-0027 ao
  contexto pós-Onda R.

### Mitigações

- **Monitoria contínua:** `R-BUNDLE-SIZE-AUDIT` deve rodar antes de
  cada release (`M41`, `M42`, etc.). Resultado entra no relatório
  `docs/auditoria-bundle-YYYY-MM-DD/RELATORIO.md`.
- **Faixa amarela em 95 % do limite (`9,98 MB`)** dispara sprint
  `R-BUNDLE-DIET-*` antes da próxima release. Não esperar atingir
  100 %.
- **Sprints de diet planejadas para v1.1** (`R-BUNDLE-DIET-CALENDARS-REPLACE`,
  `R-BUNDLE-LODASH-PATCH`) podem reduzir o bundle em ~900 KB
  combinados se acionadas. Mantidas como reserva técnica.
- **ESLint rule no-restricted-imports** (introduzida em
  `R-BUNDLE-LUCIDE-RESHIM`) impede bypass futuro do shim de ícones
  como causa do estouro do limite.

## Alternativas consideradas

### Alternativa A — Manter teto 8,85 MB e cortar features

Cortaria `react-native-calendars` (substituindo por implementação
custom) e adiaria Health Connect / integrações para v1.1. Devolveria
o bundle para ~8,7 MB.

Vantagem: APK final menor; tempo de download reduzido.
Desvantagem: meses de reescrita, perda de feature canônica
(calendário visual de Recap, agenda pessoa_a/pessoa_b), contradiz
`ROADMAP.md` Onda Q+R já entregue. Custo desproporcional ao ganho de
~3 MB no APK. **Não foi aceito.**

### Alternativa B — Aceitar 10,5 MB sem ADR

Manteria a decisão informalmente no relatório de audit, sem
documentação canônica. Validador-sprint continuaria recusando M41
por argumento "excede limite documentado em STATE/BRIEFING".

Vantagem: zero custo de docs.
Desvantagem: gating contínuo de M41, débito documental, próxima
audit (R-BUNDLE-SIZE-AUDIT v3) repete a discussão. **Não foi aceito.**

### Alternativa C (escolhida) — Revisar limite via ADR formal

Adoção formal de 10,5 MB com justificativa rastreável (features
listadas) e plano de monitoria contínua. Custo: ~30 min de docs.
Benefício: destrava M41, sela a decisão arquitetural, dá base para
audits futuras.

## Implementação

Esta ADR é apenas documental. Não toca código, configuração,
dependências ou testes. Os artefatos da decisão são:

- `docs/ADRs/0027-limite-bundle-hermes-revisado.md` — este ADR.
- `docs/ADRs/INDEX.md` — linha nova:
  `| 0027 | Limite de bundle Hermes revisado (10,5 MB) | Aceito | R-ADR-LIMITE-BUNDLE-V2 |`.

Documentos relacionados que serão atualizados pelo orquestrador (fora
desta sprint):

- `STATE.md` — substituir menção a `8,85 MB margem` por referência a
  ADR-0027.
- `CHANGELOG.md` — entry da sprint apontando para esta ADR.
- `docs/BRIEFING.md` — se mencionar `8,55 MB` como meta, atualizar
  para `10,5 MB` com referência ao ADR.

## Referências

- Relatório da audit: `docs/auditoria-bundle-2026-05-21/RELATORIO.md`.
- Spec desta sprint: `docs/sprints/R-ADR-LIMITE-BUNDLE-V2-spec.md`.
- Sprint cirúrgica pré-requisito: `R-BUNDLE-LUCIDE-RESHIM` (pendente).
- Sprints descopadas para v1.1: `R-BUNDLE-DIET-CALENDARS-REPLACE`,
  `R-BUNDLE-LODASH-PATCH`.
- Linha base anterior: `docs/auditoria-bundle-2026-05-04/RELATORIO.md`.
- ADR-0006 — Stack Expo + RN (consequência calibrada).
- ADR-0010 — Estética como fundação (não relaxada por este ADR).

## Notas

- O número `10,5 MB` refere-se a bytes decimais (`10.500.000 B`), não
  binários. Métrica é a saída de `stat -c %s` no arquivo `.hbc`, sem
  conversão para MiB.
- Bundle iOS não é coberto por este ADR. Tipicamente é proporcional,
  mas pode divergir por módulos `.ios.tsx`. Sprint dedicada
  `R-BUNDLE-SIZE-AUDIT-IOS` fica como follow-up futuro se houver
  evidência de divergência.
- A medida do APK final (Hermes + `.so` nativos + assets + resources)
  é tipicamente 5-10 × maior que o bundle Hermes Android isolado.
  Esta ADR não regula o tamanho do APK, apenas do bundle JS Hermes.
  Sprint dedicada para limite de APK pode ser criada se necessário
  no futuro.

## Pós-script (2026-05-21 — sprint R-BUNDLE-LUCIDE-RESHIM aplicada)

Esta ADR foi escrita com bundle medido em **10,23 MB** (commit
`621ae0b`). Logo depois, a sprint derivada `R-BUNDLE-LUCIDE-RESHIM`
foi entregue (worktree `acd5714c`) com ganho **2,7× maior que o
estimado** — a remoção do bypass único do shim em `app/index.tsx:29`
deixou o Hermes eliminar não só os ícones diretos do `lucide-react-native`
mas a barrel inteira que o bypass mantinha reachable.

**Medida real pós-reshim (mesmo dia):**

| Etapa | Bundle Hermes Android |
|---|---|
| Pré-reshim (audit base) | 10.233.199 B (10,23 MB) |
| Estimativa do spec | -650 KB → 9,58 MB esperado |
| **Pós-reshim (real)** | **8.479.055 B (8,48 MB)** |
| Delta real | **-1.754.144 B (-1,67 MB, -17,14 %)** |

**Implicação para esta ADR:**

O teto de **10,5 MB** continua válido — agora oferece **~2 MB de folga**
sobre o estado atual de 8,48 MB (vs ~0,3 MB de folga sobre 10,23 MB no
momento da redação). A folga maior permite acomodar Onda 4 inteira (R-SEC,
R-PLAYCONSOLE, M37.2) + features pós-v1.0 sem urgência. O gatilho de
sprint de diet (≥ 95 % do teto = 9.975.000 B) só dispararia se o bundle
crescer +1,5 MB a partir do estado atual — folga generosa, conserva o
caráter conservador da decisão.

**Decisão durá­vel:** ADR-0027 não é revisada; teto 10,5 MB permanece. O
ganho da reshim é registrado aqui para rastreabilidade — quem ler o ADR
no futuro entende por que escolhemos 10,5 MB com bundle em 8,48 MB
(antecipação de Onda 4 + buffer contra regressões).
