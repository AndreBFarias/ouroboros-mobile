# Auditoria do Estado do Projeto — 2026-05-04

> Diagnóstico do **dono do projeto** (maestro) sobre se o ouroboros-mobile
> está caminhando rumo ao objetivo principal ou virando Frankenstein.
> Documento gerado para forçar pausa estratégica antes de continuar
> empilhando sprints.

---

## TL;DR

**Status: caminhando certo, MAS com 3 riscos estruturais que precisam ser
endereçados antes do release v1.0.0.** O projeto tem fundação sólida
(Vault canônico, Gauntlet, anti-débito, FEATURES-CANONICAS), mas
acumulou 13 sprints `[todo]` pendentes e tem **lacunas críticas
não-mapeadas** que ninguém viu porque ninguém parou para auditar.

---

## 1. O que está bem

1. **Vault físico é fundação sólida.** 19 subpastas canônicas em
   `~/Protocolo-Ouroboros/`, `.md` por registro, mídias originais
   preservadas em pastas dedicadas, hierarquia idiomática Obsidian.
   Filosofia "dados são arquivos" respeitada.
2. **Gauntlet (Nível A+) é infra real.** 16 APIs em `__gauntlet`,
   bypass de gates, frame mobile 412×892dp, validação visual
   reproduzível. Diferencial competitivo do projeto.
3. **Anti-débito empírico funciona.** Dezenas de achados colaterais
   viraram specs próprias em vez de fixes silenciosos. Histórico
   rastreável.
4. **FEATURES-CANONICAS.md é fonte única de verdade.** Validador
   recusa sprint que não atualiza. Boa governança.
5. **Métricas saudáveis.** 1300 testes / 145 suítes / TS strict 0 /
   anonimato OK / smoke verde mantido em todas as sprints da sessão.
6. **Decisões arquiteturais documentadas.** 19 ADRs formalizadas
   cobrindo capitalização, vault dedicado, identidade dinâmica, cache
   readonly, mídia companion.
7. **Filosofia clara em CONTEXTO.md.** "Fricção zero é existencial",
   "estética é essencial", "dados são arquivos", "privacidade absoluta
   sem nuvem". Guarda contra scope creep.

---

## 2. Onde há risco de Frankenstein

### 2.1 Bundle Hermes no teto exato (8.85 MB / limite 8.85 MB)

Margem **zero**. Próxima feature mediana estoura o limite — vai exigir
remoção de algo já feito. Sintoma de empilhar sem orçamento.

**Ação:** auditar deps `node_modules` para gordura removível
(framer-motion via moti, gluestack legacy, @react-native-community
duplicados). Sprint **M-BUNDLE-DIET** sugerida.

### 2.2 Spec M01.6 reaproveitada por engano

Numeração frágil. Já aconteceu (M01.7 renomeada de cima da hora).
**Ação:** check no validador-sprint que recusa spec com ID já presente
em git log.

### 2.3 14 sprints fechadas em 1 dia

Velocidade ≠ qualidade. Cada uma passou smoke + Gauntlet, mas
**ninguém usou o app por 30 minutos** desde a M28. Smoke testa
unidades, não experiência integrada de usuário real.

**Ação:** sprint **M-FIELD-TEST** (uso real 7 dias antes de M41).

### 2.4 Lacunas críticas SEM SPRINT

Auditoria revelou 5 temas óbvios que **deveriam ter spec mas NÃO têm**:

| Lacuna | Sintoma | Risco se não tratar |
|---|---|---|
| **Ícone do app + splash final** | `assets/icon.png` é placeholder | Release com ícone padrão Expo (vergonha) |
| **WCAG / TalkBack / acessibilidade** | Zero spec sobre screen reader | App inacessível em produto v1.0 |
| **Settings → Sobre / release notes** | Sem versão/changelog visível | Usuário não sabe o que mudou |
| **Backup automático periódico** | Export é manual | Perda de dados se Syncthing falhar |
| **Field-test em celular real** | Smoke é unitário, Gauntlet é web | Bugs reais escapam até release |

**Ação:** materializar 5 specs novas (proposto abaixo).

### 2.5 Sequência ilógica na fila

A fila atual coloca **features (M-CAPTURA-UNIFICADA, M11.4)** ANTES
das **fundações (M-VAULT-MD-AUDIT, M-EXPORT-COMPLETO)**.

Lógica correta: fundação → polish → features → release. Hoje está
embaralhado.

**Ação:** reordenamento por blocos (proposto abaixo).

### 2.6 4 sprints bloqueadas por dev-client EAS

M06.5 (microfone), M07.x (conquistas mídia), M11.5 (calendário
conquistas), M09 (scanner OCR) — todas dependem de EAS dev-client.
Bloqueio antigo, sem plano de unlock. Risco: M41 chega e essas
features ficam em v1.1.

**Ação:** decisão DURÁVEL do dono — essas features ficam para v1.1
ou são bloqueantes para v1.0?

### 2.7 Sem prova end-to-end de export → restore

Promessa do projeto: "dados portáveis". Mas ninguém validou que
`exportarVaultZip` produz um ZIP que pode ser restaurado no MESMO
estado em outro dispositivo. M-EXPORT-COMPLETO atende, mas está em
posição 22 da fila. Deveria ser top 3.

---

## 3. Sprints faltando (precisam ser materializadas)

### 3.1 M-BUNDLE-DIET — Auditoria + redução de bundle

Auditar `node_modules` e remover 200-500 KB de gordura. Liberar
margem para features futuras antes que uma estoure 8.85 MB.

### 3.2 M-WCAG-COMPLETO — Acessibilidade de produto

Audit + fixes de TalkBack, contraste WCAG AA em TODAS as telas
(não só botão Registrar foto), focus order, screen reader labels
consistentes. Bloqueia M41.

### 3.3 M-RELEASE-ASSETS — Ícone, splash, app name finais

Ícone do app desenhado (não placeholder), splash com Ouroboros,
nome final no launcher Android, adaptive-icon. Validação Nível B
(emulador) + C (celular real). Bloqueia M41.

### 3.4 M-SOBRE-RELEASE-NOTES — Settings → Sobre

Tela "Sobre o app" em Settings com versão, build, hash do commit,
mini-changelog amigável (não markdown raw), créditos genéricos
(sem nome de autor por Regra −1), link para repo público.

### 3.5 M-FIELD-TEST — Uso real 7 dias

Plano de teste em celular físico do usuário por 7 dias com
checklist diário. Capturar bugs visuais, race conditions, UX
desconforto. Pré-requisito M41. **Esta é a única sprint que não
pode ser dispatchada para agente — exige usuário humano.**

### 3.6 M-DEV-CLIENT-DECISAO — Decisão dura sobre M06.5/M07.x/M09/M11.5

Spec curta de **decisão**, não implementação. Dono escolhe:
- (a) v1.0 com microfone/scanner/conquistas-mídia/calendário-conquistas
  desabilitados via toggle "Coming soon".
- (b) v1.0 espera EAS dev-client buildar e essas 4 fecharem (atrasa
  release).

Após decisão, atualiza ROADMAP final.

---

## 4. Reordenamento proposto (em blocos)

### Bloco A — Fundação (top da fila, prioridade absoluta)

| # | Sprint | Por quê |
|---|---|---|
| 1 | **M-PT-BR-AUDIT** | Qualidade textual fundamento. Hook bloqueia futuras violações. |
| 2 | **M-VAULT-MD-AUDIT** | Confirma que tudo realmente é .md em estrutura Obsidian-compat. |
| 3 | **M39** (mídia companion ADR-0017) | Formaliza estrutura de mídia. M34 entregou preliminar. |
| 4 | **M-EXPORT-COMPLETO** | Backup confiável + restore inverso simétrico. |

### Bloco B — Polish UX (corrige débitos visíveis ao usuário)

| # | Sprint | Por quê |
|---|---|---|
| 5 | **M-CAPTURA-UNIFICADA** | "Câmera" do MenuLateral hoje é caminho quebrado. |
| 6 | **M11.4** (evolução corporal) | Integra Marcos+Medidas no fluxo central de "evolução". |
| 7 | **M-DEBITO-CATEGORIA-CORES** | 8 chips laranja é inconsistência cosmética. |
| 8 | **M40** (Tela Hoje v2) | Hoje é a primeira tela — precisa entregar valor imediato. |
| 9 | **M36** (Recap) | "Espelho otimista" — coração emocional do projeto. |
| 10 | **M35** (Finanças empty state) | Honestidade sobre o que está pronto. |

### Bloco C — Release-readiness (NOVOS, propostos nesta auditoria)

| # | Sprint | Por quê |
|---|---|---|
| 11 | **M-BUNDLE-DIET** | Liberar margem antes de estourar 8.85 MB. |
| 12 | **M-WCAG-COMPLETO** | Produto v1.0 inacessível é falha. |
| 13 | **M-RELEASE-ASSETS** | Ícone/splash placeholder no Play Store é vergonha. |
| 14 | **M-SOBRE-RELEASE-NOTES** | Usuário precisa saber o que está rodando. |
| 15 | **M-GAUNTLET-DEAD-CODE-V2** | Bytecode Android com `__gauntlet` vazado é leak. |
| 16 | **M38** (conflict resolution) | 4 dispositivos do casal sem isso = corrupção. |

### Bloco D — Decisão do dono

| # | Sprint | Por quê |
|---|---|---|
| 17 | **M-DEV-CLIENT-DECISAO** | Decidir M06.5/M07.x/M09/M11.5 em v1.0 ou v1.1. |

### Bloco E — Features adiáveis para v1.1 (se M-DEV-CLIENT-DECISAO disser "espera")

- M06.5 microfone
- M07.x conquistas mídia
- M11.5 calendário conquistas
- M09 scanner OCR
- M37.1+M37.2 Google Calendar (PAUSA usuário OAuth)
- M-ROTINA-TREINO

### Bloco F — Field test (humano-only, antes de M41)

- **M-FIELD-TEST** — 7 dias uso real

### Bloco G — Release final

- **M41** — APK v1.0.0 + GitHub Release

---

## 5. Decisões pendentes do dono

Antes de eu materializar e seguir, preciso de OK em:

### 5.1 v1.0 inclui ou não as 4 sprints bloqueadas por dev-client?

- (a) Inclui — esperamos EAS buildar antes de M41
- (b) Não inclui — ficam como toggle "Coming soon" em Settings

### 5.2 Field test (7 dias) é bloqueante para M41?

- (a) Sim — só lança após field test verde
- (b) Não — lança e patcha em v1.0.1 baseado em feedback

### 5.3 As 5 sprints novas propostas (M-BUNDLE-DIET, M-WCAG-COMPLETO, M-RELEASE-ASSETS, M-SOBRE-RELEASE-NOTES, M-FIELD-TEST) entram em qual ordem?

- (a) Bloco C (release-readiness) na ordem proposta
- (b) Outra ordem
- (c) Algumas viram v1.1

### 5.4 M-DEV-CLIENT-DECISAO é spec separada ou eu decido aqui?

Posso criar a spec ou você decide agora e eu atualizo ROADMAP.

---

## 6. Diagnóstico final

**Não está virando Frankenstein** — temos governança (anti-débito,
FEATURES-CANONICAS, validador-sprint, Gauntlet) que evita o pior.

**Mas tem riscos reais** que precisam ser endereçados em ordem:
1. Falta validar que a fundação (Vault + export) realmente funciona
   end-to-end como prometido.
2. Faltam 5 sprints óbvias para release de produto (não só feature).
3. Bundle estourando + dev-client travado + sem field test = release
   com problemas reais escapando.

**Recomendação:** pausar empilhamento de features até fechar Bloco A
(Fundação) + Bloco B parcial (polish UX). Bloco C cresce em paralelo
materializando as 5 sprints novas.

**Tempo estimado para v1.0 completo realista:**
- Bloco A: 11-14h (4 sprints)
- Bloco B: 18-23h (6 sprints)
- Bloco C: 15-22h (6 sprints)
- Bloco D: 0,5h (1 decisão)
- Bloco F: 7 dias (calendário, não horas)
- Bloco G (M41): 3-4h

**Total estimado:** 47-63h de trabalho ativo + 7 dias de field test.
Em ritmo de 1 sprint/sessão paralelizada = 2-3 sessões maratona +
field test.

---

## 7. Ação imediata sugerida

1. Dono lê esta auditoria.
2. Dono decide §5.1, §5.2, §5.3, §5.4.
3. Maestro materializa as 5 specs novas + atualiza ROADMAP com nova
   ordem.
4. Maestro inicia Bloco A (top: M-PT-BR-AUDIT em paralelo com
   M-VAULT-MD-AUDIT — arquivos disjuntos).
