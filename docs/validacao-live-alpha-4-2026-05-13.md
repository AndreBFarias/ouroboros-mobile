# Validação live integrada — v1.0.0-alpha-4 (Xiaomi HyperOS)

> Data: 2026-05-13 (tarde)
> Build validado: `v1.0.0-alpha-4` (EAS preview, commit `a1dd3c9`, versionCode 3, 157 MB universal)
> Celular: Xiaomi 2312DRAABG (HyperOS 15, 1080×2400)
> Identificação ADB: `carsvg7du8kfnrlj`
> Validador: orquestrador via ADB + uiautomator + scrot/convert

## Sumário executivo

Validação **PARCIAL**. Alpha-4 é build pré-Q17/Q18.b/Q19.b
(commit `a1dd3c9` é anterior a `cee0d17` que introduz Health Connect
completo). Itens 5, 9, 10, 11, 12, 13 do checklist mínimo são
**impossíveis em alpha-4** — só validáveis em alpha-5 ou alpha-6.

Decisão registrada: alpha-5 tem signature incompatível (debug
keystore vs EAS keystore), troca exigiria uninstall + perder vault.
Optou-se por aguardar alpha-6 (depende de Q23 + Q17.e) que herdará
signature EAS via keystore em Secrets.

**Resultado em escopo viável (alpha-4 — itens 1, 2, 3, 4, 6, 7, 8):**

| # | Feature | Resultado | Evidência |
|---|---|---|---|
| 1 | Onboarding/Home com vault preservado | **PASS** | `01-home-redacted.png` (cards Status do casal, Recap, FAB menu) |
| 2 | BotaoRecap visível e tappable | **PASS** | `01-home-redacted.png` (pill Recap canto direito header) |
| 3 | Tela Hoje carrega lista do dia | **PASS** | Mesmo screenshot (estado vazio "Nada nas próximas horas") |
| 4 | Saúde Física → abas Treinos/Evolução/Exercícios | **PASS** | `05-saude-fisica.png`, `06-saude-evolucao.png`. Nota: checklist original previa 4 abas; FEATURES-CANONICAS §3 confirma que são 3 (WAI) |
| 6 | Sheet "Diário emocional" com botões "Gravar áudio" + "Transcrever" separados (Q5.1/Q5.2) | **PASS visual** | `15-voz-sheet.png`. Save Q6 não testado via automação (uiautomator bloqueado por idle state durante anim slider) |
| 7 | Ciclo menstrual persiste após reabrir app (Q8) | **PASS** | `19-ciclo-deeplink.png` mostra "Dia 2 do ciclo", duração 28d, registro 12/05 "Menstrual / Cólica". Vault sobreviveu ao install -r do alpha-4 over o build anterior |
| 8 | Sheet "Registrar momento" abre em primeira tentativa (Q7) | **PASS** | `18-camera-sheet.png` (sheet apareceu sem retry 800ms — bug original corrigido) |

**Itens pré-features (validar em alpha-6):**

| # | Feature | Status alpha-4 |
|---|---|---|
| 5 | Menu lateral entry "Rotinas" (Q14) | **N/A** — Q14 (`908c97a docs: estado pos-alpha-5`) entrou depois de alpha-4 |
| 9 | `/settings/integracoes` toggle HC | **N/A** — deep link retorna "Unmatched Route"; arquivo `app/settings/integracoes.tsx` não está em `a1dd3c9` |
| 10 | Aba Evolução mostra 3 cards "Importados de Conexão Saúde" (Q17.d) | **N/A** — Q17.d (`ff89ad8`) pós-alpha-4. Aba Evolução mostra apenas EVOLUÇÃO CORPORAL com empty state + card de marco |
| 11 | `/exercicios/<slug>` com MidiaExecucaoPlayer Q18.b | **N/A** — Q18.b (`272c912`) pós-alpha-4 |
| 12 | `/treinos/executar/<slug>` thumbnail 96×96 (Q18.b) | **N/A** |
| 13 | `/grupos/novo` → sheet "Qual treino hoje?" → executor (Q19.b) | **N/A** — `app/grupos/` não existe em alpha-4 |

## Diagnóstico de alpha-4 vs alpha-5 vs alpha-6

```
a1dd3c9  chore: bump versionCode 2 to 3 release alpha-4
cee0d17  feat: q17 health connect completo sync read+write+toggle integracoes link
46bec14  fix: bump compilesdk e targetsdk pra 35 (alpha-5) [build via GitHub Actions]
908c97a  docs: estado pos-alpha-5 publicado + onda q sessao 7
ff89ad8  feat: q17.d bloco importados de conexao saude em evolucao corporal
...
ec526f9  chore: sanitizacao pos-sessao + 4 specs novas + state callout
```

- **Alpha-4** (EAS, keystore EAS): tem features Q0-Q13. Sem Q14/Q17/Q18.b/Q19.b.
- **Alpha-5** (Actions, keystore debug): tem todas as features mas OAuth Google quebrado (debug keystore não está autorizado no Google Cloud Console).
- **Alpha-6** (futuro): aguarda Q23 (bump compileSdk 35) + Q17.e (keystore EAS em Secrets do repo) → CI gera APK com signature EAS preservada e features atualizadas.

## Achados durante a validação

### Comportamento confirmado (Working As Intended)

- **Sheet "Diário emocional"** abre limpo, com modo Vitória pré-selecionado por contexto (heurística). Botões "Gravar áudio" e "Transcrever" são visualmente separados conforme Q5.1/Q5.2.
- **Sheet "Registrar momento"** abre em primeira tentativa em alpha-4. Bug original do retry 800ms (Q7) não reproduziu — pode ter sido corrigido no commit `f895b93` (V4.0.2 part 1-8 + bottomsheet animateOnMount).
- **Vault sobreviveu** ao `pm install -r` do alpha-4 over build anterior (versionCode 2 → 3). Signature EAS compatível.
- **Tela `/ciclo`** acessível via deep link com registro pré-existente persistido (Menstrual ter 12/05 + Cólica) — Q8 confirmado.

### Limitação de método

- `uiautomator dump` falha com "could not get idle state" enquanto bottomsheets têm sliders/recorder animando. **Workaround:** aguardar 3-5s adicionais ou usar `--compressed`. Não impede screenshot via `screencap`.
- `run-as` bloqueado em alpha-4 (EAS preview release-like com `debuggable=false`). Inspeção do disco do app só via SAF Picker manual ou backup pré-install.
- Save real de áudio (m4a) via diário não testado: requer hold real no mic + permissão runtime, complexo via adb. Marcar para validação manual do dono.

### Pendências para validação manual do dono

1. **Save Q6 do diário emocional**: gravar áudio 3s real + transcrever + salvar. Confirmar ausência do erro "GO_BACK was not handled".
2. **OAuth Google Calendar**: alpha-4 tem signature EAS compatível com Google Cloud (não validado nesta sessão por exigir interação Google). `Settings → Contas Google → Conectar`.
3. **Permissão de microfone runtime**: verificar diálogo HyperOS na primeira gravação.

## Evidência visual

Em `docs/validacao-live-alpha-4-2026-05-13/`. Screenshots redactados
(nomes `pessoa_a`/`pessoa_b` e URLs Spotify pessoais cobertos com
retângulo `#2a2638`):

- `01-home-redacted.png` — Home (vault preservado), Status do casal redactado, BotaoRecap, FAB
- `02-menu-lateral.png` — Drawer Acesso Rápido / Registrar / Configurações (sem entry Rotinas em alpha-4)
- `03-saude-fisica-visao.png` — Home re-renderizada (drawer fechou no overlay tap)
- `05-saude-fisica.png` — Saúde Física aba Treinos (3 abas confirmadas)
- `06-saude-evolucao.png` — Aba Evolução com EVOLUÇÃO CORPORAL + marco (sem bloco HC Q17.d em alpha-4 — pré-feature)
- `09-configuracoes.png` — Configurações SOM/PESSOA (sem entry Integrações em alpha-4)
- `12-integracoes-deeplink.png` — Deep link `/settings/integracoes` retorna "Unmatched Route" (rota não bundlada em alpha-4)
- `13-home-retorno.png` — Home pós-reset (KEYCODE_BACK do Unmatched Route)
- `15-voz-sheet.png` — Sheet Diário emocional com botões "Gravar áudio" + "Transcrever" separados (Q5.1/Q5.2)
- `18-camera-sheet.png` — Sheet "O que você quer registrar?" (Q7 abre em primeira tentativa)
- `19-ciclo-deeplink.png` — Tela `/ciclo` com persistência (Dia 2, "Menstrual ter 12/05 / Cólica")

Screenshots raw em `/tmp/alpha4-runtime/` (sem redact, NÃO commitar).

## Decisão e próximos passos

1. **Implementar Q23** (`docs/sprints/Q23-COMPILESDK-35-spec.md`)
   — bump `compileSdk 35` via expo-build-properties, ~15min.
2. **Q17.e** (`docs/sprints/Q17e-KEYSTORE-EAS-EM-SECRETS-spec.md`)
   — depende de o dono gerar/exportar `EAS_KEYSTORE_BASE64` e colocar
   em GitHub Secrets do repo.
3. **Disparar workflow** `build-android-apk.yml` com Q23 aplicado
   → gera alpha-6 com signature compatível ao alpha-4.
4. **Validação live alpha-6** seguindo este mesmo checklist, agora
   cobrindo todos os 13 itens (incluindo Q14/Q17/Q18.b/Q19.b).
5. **Validação manual** do dono dos 3 pontos listados em
   "Pendências para validação manual" — pode ser feita já no alpha-4
   (não exige alpha-6).

## Aritmética da decisão de aguardar alpha-6

- Trocar pra alpha-5 (custo): uninstall → vault vazio → onboarding
  do zero → ~10min refazendo dados de teste → validar 6 itens
  Q17/Q18.b/Q19.b → reinstalar alpha-4 → vault vazio de novo → mais
  10min onboarding. Total: **~1h30 de retrabalho**, ainda sem OAuth.
- Aguardar alpha-6 (custo): Q23 ~15min + dispatch workflow ~25min
  (build CI) + Q17.e depende do dono ~10min. Total: **~50min**,
  preserva vault e ganha OAuth.

Aguardar alpha-6 é estritamente melhor: menos tempo + sem perda de
estado + cobertura completa.
