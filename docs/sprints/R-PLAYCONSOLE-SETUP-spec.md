# R-PLAYCONSOLE-SETUP — Registrar app no Google Play Console

**Tipo**: docs + cloud-config (ação primária do dono, não código)
**Prioridade**: P1-high
**Estimativa**: ~40min de trabalho do dono (espalhado em 24-72h por causa de verificação + propagação)
**Tranche**: R-SEC (complementa R-SEC-2)
**Fase**: 4 — **ÚLTIMA sprint antes do build final v1.0.0** (decisão dono 2026-05-15)
**Decisão**: D4 = SIM (dono autorizou pagar $25 one-time em 2026-05-15)
**Status atual** (2026-05-15 fim de noite):
- Conta Developer pessoal **criada e paga** ($25 USD)
- Verificação de identidade **submetida** (RG/CNH + selfie)
- **Aguardando aprovação Google** (24-48h)
- Passos 1-2 da TODO list: **concluídos**
- Passos 3-8: pendentes (executar após aprovação)

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-2 (relacionada).

TODO list executável foi entregue no chat em 2026-05-15. Replicada
abaixo como referência durável.

## Objetivo

Criar conta Google Play Developer, registrar `com.ouroboros.mobile`
em Internal Testing track, propagar keystore canônica EAS pra Play
Protect deixar de avisar "app não verificado" em instalações
side-loaded.

## Entregáveis (do dono — eu acompanho)

### Pré-requisitos
- [ ] Cartão de crédito $25 USD
- [ ] Conta Google dona (`andre.dsbf@gmail.com` ou dedicada)
- [ ] RG/CNH disponível pra verificação
- [ ] Telefone com SMS

### Passo 1 — Criar conta Developer (~15min) — **CONCLUÍDO 2026-05-15**
- [x] `play.google.com/console/signup`
- [x] Tipo: Developer pessoal (não Organização)
- [x] Pagar $25 USD
- [x] E-mail de confirmação recebido
- [x] Verificação identidade submetida (RG/CNH + selfie)
- [ ] **Aguardando aprovação Google** (24-48h após submissão)

### Passo 2 — Criar app (5min, pós-aprovação)
- [ ] Play Console → All apps → Create app
- [ ] App name: `Ouroboros`
- [ ] Language: pt-BR
- [ ] App or game: App
- [ ] Free
- [ ] Aceitar declarações

### Passo 3 — Internal Testing track (10min)
- [ ] Release → Testing → Internal testing → Create new release
- [ ] Aceitar Play App Signing
- [ ] Upload APK `v1.0.0-alpha-11.apk` (ou mais recente)
- [ ] Se keystore não corresponder: exportar `.pem` da EAS canônica
  via `eas credentials` e upload em App Signing → Upload key certificate
- [ ] Release name: `1.0.0-alpha-11-internal`
- [ ] Save → Review → Start rollout

### Passo 4 — Internal testers (5min)
- [ ] Create email list `ouroboros-testers`
- [ ] `andre.dsbf@gmail.com` + e-mail da Vitória
- [ ] Save

### Passo 5 — Store listing mínimo (10min)
- [ ] Grow → Store listing
- [ ] Short description: "Diário de bem-estar pessoal para uso conjunto"
- [ ] Full description: "App de captura de humor, eventos, conquistas e tarefas para uso pessoal entre duas pessoas. Persistência local em Markdown, sincronização via Syncthing, zero telemetria."
- [ ] App icon: `assets/icon.png` (512x512 — já existe)
- [ ] Feature graphic 1024x500 (pode usar placeholder ou criar sprint cosmética)
- [ ] 2+ screenshots phone
- [ ] Category: Health & Fitness ou Lifestyle
- [ ] Save

### Passo 6 — Privacy Policy URL (depende de R-SEC-3)
- [ ] R-SEC-3 publica `privacy.html` no GitHub Pages
- [ ] Colar URL `https://andrebfarias.github.io/ouroboros-mobile/privacy.html`

### Passo 7 — Data safety form (10min)
- [ ] Policy → App content → Data safety
- [ ] Coleta: Sim (Vault local) / Compartilhamento externo: Não
- [ ] Tipos: Personal info (nome), Health (humor/medidas), Photos & videos
- [ ] Propósito: App functionality only
- [ ] Encrypted in transit: N/A
- [ ] User can delete: Sim
- [ ] Save

### Passo 8 — Propagação Play Protect (24-48h)
- [ ] Aguardar
- [ ] Validar: instalar APK side-load em ≥3 devices SEM aviso

## Dependências

- **Bloqueia**: R-SEC-2 (sem conta Play Console, R-SEC-2 não fecha)
- **Bloqueado por**: R-SEC-3 (privacy policy URL — passo 6)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `docs/RELEASE.md` (atualizar checklist),
`docs/OAUTH-SETUP.md` (cross-ref).

## Verificação

- [ ] Console Play → app aparece em Internal testing
- [ ] Testers list com 2 e-mails
- [ ] APK instalado em 3 devices sem aviso de Play Protect
- [ ] Vitória recebe e-mail "You're now an internal tester"

## Proof-of-work

1. Screenshots do Play Console em `docs/sprints/R-PLAYCONSOLE-SETUP-screenshots/`:
   - Conta criada
   - App listado
   - Internal track release
   - Testers list
2. Confirmação de Vitória conseguir instalar via link interno.
3. Validação Play Protect silencioso em ≥3 devices.
4. Atualização em `docs/RELEASE.md` com link da conta + processo replicável.

## Decisões tomadas

- **Tipo Developer pessoal**: não Organização (evita verificação CNPJ).
- **Internal Testing**: não publicar pro público em geral. Distribuição segue manual via Syncthing/link direto + benefício é Play Protect tranquilo.
- **Store listing mínimo**: feature graphic placeholder OK; investir tempo só se futuro publicar pra produção.
- **Não submeter pra Google Verification** ($15-75k pra sensitive scopes) — fora do escopo.
