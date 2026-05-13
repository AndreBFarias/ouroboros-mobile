# Q17 — Integração Health Connect Android

> **Tamanho:** Grande (1.5–2 dias de trabalho)
> **Bloqueia v1.0.0?** Não. Candidata a v1.0.x (alpha-5) ou v1.1.
> **Pré-requisitos:** Android 14+ (Health Connect nativo) ou Android
> 13− com APK Health Connect (`com.google.android.apps.healthdata`)
> instalado pelo usuário.

## Contexto

Hoje (HEAD `a1dd3c9`) o app Ouroboros não aparece em "Conexão Saúde"
do Android (Health Connect). Quando o usuário abre Configurações →
Health Connect → "Apps conectados", a lista mostra apenas apps de
saúde tradicionais (Mi Fit, Samsung Health, Google Fit) — Ouroboros
fica invisível ali.

O motivo é técnico: Health Connect é uma API do Android (também
chamada de `androidx.health.connect:connect-client`) que exige:

1. Pacote nativo bridge (`react-native-health-connect`) instalado e
   linkado via Expo Config Plugin.
2. Declaração no `AndroidManifest.xml` (via `app.json`) de
   `<intent-filter>` com action `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
   apontando para uma Activity que explica como o app usa dados.
3. Lista de permissões explícitas no manifest (`android.permission.health.READ_*`
   e `WRITE_*` por tipo).
4. Activity custom OU rota expo-router dedicada a abrir quando o
   sistema solicitar racional de privacidade.

Sem esses 4 itens, o sistema NÃO lista o app na tela "Apps conectados"
e qualquer chamada SDK falha com `PROVIDER_NOT_INSTALLED` ou similar.

## Objetivo da sprint

Tornar o Ouroboros um cliente Health Connect (leitor + gravador)
para os tipos canônicos abaixo, listado em "Apps conectados" do
Android e respeitando o fluxo de consentimento padrão Google.

### Tipos canônicos cobertos nesta sprint

| Tipo HC                          | Direção         | Origem/destino no Vault                       |
|----------------------------------|-----------------|-----------------------------------------------|
| `Steps`                          | Read            | (não persiste no Vault — leitura passiva)     |
| `ExerciseSessionRecord`          | Read + Write    | `markdown/treino-YYYY-MM-DD-<slug>.md` (read) |
| `BodyFatRecord`                  | Read + Write    | `markdown/medida-<slug>.md`                   |
| `WeightRecord`                   | Read + Write    | `markdown/medida-<slug>.md`                   |
| `HeartRateRecord`                | Read only       | apenas exibe em "Saúde Física → Evolução"     |
| `SleepSessionRecord`             | Read only       | apenas exibe em "Saúde Física → Evolução"     |
| `MenstruationFlowRecord`         | Read + Write    | `markdown/ciclo-YYYY-MM-DD.md`                |
| `IntermenstrualBleedingRecord`   | Read + Write    | `markdown/ciclo-YYYY-MM-DD.md` (sintomas)     |

> Tipos fora desta lista (alimentação, hidratação, temperatura) ficam
> para sprint futura Q17.x se a comunidade pedir.

## Decisões técnicas firmes

- **Pacote NPM:** `react-native-health-connect` (mantido por
  Matinzk, MIT). Versão alvo: `^3.4.0` (compatível com Expo SDK 51+).
- **Config Plugin:** `[ "react-native-health-connect", { ... } ]` em
  `app.json` plugins.
- **Min SDK Android:** 28 (já é o nosso baseline). HC funciona em
  Android 26+ via APK externo; em Android 14+ é nativo.
- **OAuth de Health Connect:** não existe. É só permission grant
  in-app — o usuário aceita por tipo em uma sheet do sistema.
- **Provider declaration:** *não fazemos* — o Ouroboros é APENAS
  cliente, não provedor. Outros apps não leem nossos dados.
- **Sync direction default:** **leitura pull on-demand** (não há
  background sync). Cada vez que o usuário entra em Saúde Física →
  Evolução, o hook puxa dados HC dos últimos 30 dias. Write é
  imediato no save do Vault (treino, medida, ciclo).
- **Onde a UI conectar mora:** `/settings/integracoes` (nova rota,
  filha de `/settings`). Card "Conexão Saúde (Android)" com toggle
  "Conectar" + lista de permissões concedidas.

## Arquivos a criar/modificar

### Novos

1. `src/lib/health/availability.ts`
   - `verificarDisponibilidade(): Promise<'available' | 'needs_update' | 'unavailable'>`
   - Wrappers tipados sobre `getSdkStatus()` do SDK.

2. `src/lib/health/permissions.ts`
   - `solicitarPermissoes(tipos: HealthPermission[]): Promise<HealthPermission[]>`
   - `permissoesConcedidas(): Promise<HealthPermission[]>`
   - Mapeia tipos canônicos do nosso projeto → permissions do SDK.

3. `src/lib/health/sync.ts`
   - `sincronizarTreinos(from: Date, to: Date): Promise<TreinoSessao[]>` (read HC → mapping → return)
   - `escreverTreino(meta: TreinoSessao): Promise<void>` (Vault → HC)
   - `sincronizarMedidas(from: Date, to: Date): Promise<MedidaSnapshot[]>`
   - `sincronizarCiclo(from: Date, to: Date): Promise<RegistroCiclo[]>`

4. `app/settings/integracoes.tsx` (NOVA rota)
   - Lista de integrações disponíveis.
   - Card "Conexão Saúde": toggle Conectar/Desconectar + status SDK.
   - Após conectar: lista de permissions ativas + botão "Adicionar tipos".

5. `app/_internal/health-rationale.tsx` (NOVA rota, only for HC)
   - Tela exibida quando o sistema solicitar racional de privacidade
     (intent action `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`).
   - Conteúdo: como o app usa cada tipo, política de retenção (local),
     ausência de envio para servidor.

6. `tests/lib/health/availability.test.ts` (mockado)
7. `tests/lib/health/permissions.test.ts` (mockado)
8. `tests/lib/health/sync.test.ts` (mockado com fixtures)
9. `tests/e2e/playwright/q17-health-connect.e2e.ts` (mock do SDK)

### Modificações

- `app.json`:
  - `plugins`: adicionar entrada `react-native-health-connect`.
  - `android.permissions`: adicionar `android.permission.health.READ_STEPS`,
    `WRITE_EXERCISE`, etc. (lista completa em comentário no manifest gerado).
  - `android.intentFilters`: adicionar action
    `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`.

- `package.json`:
  - `react-native-health-connect: ^3.4.0`

- `docs/FEATURES-CANONICAS.md`:
  - Nova seção `§3.7 Integração Health Connect`.

- `app/settings/index.tsx` (existente):
  - Adicionar item "Integrações" → `/settings/integracoes`.

## Proof-of-work esperado

Comandos runtime-real (não simulação) que comprovam a entrega:

1. **APK instalado em Android 14+:**
   ```bash
   adb install -r builds/ouroboros-1.0.0-alpha-5.apk
   ```

2. **App aparece em Conexão Saúde:**
   ```bash
   adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS
   adb shell screencap -p /sdcard/hc.png && adb pull /sdcard/hc.png /tmp/hc.png
   # Read /tmp/hc.png e confirmar visualmente "Ouroboros" listado em
   # "Apps conectados" OU "Disponíveis para conectar".
   ```

3. **Conectar via app:**
   ```bash
   # Navegar Menu → Configurações → Integrações → Conexão Saúde
   # Tap "Conectar" → sheet do sistema lista permissões pedidas
   # Aceitar Step, Weight, Exercise
   # adb shell uiautomator dump confirma checkmarks
   ```

4. **Write live: gravar uma sessão de treino no app gera record em HC:**
   ```bash
   # Após registrar treino via "Iniciar treino" (Q11.c) ou via
   # SheetNovoTreino:
   adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS
   # Navegar Exercise → confirmar entry "Ouroboros · 30 min · 2026-05-13" listado
   ```

5. **Read live: sessão criada em Mi Fit/Samsung Health aparece em
   Saúde Física → Evolução do Ouroboros:**
   ```bash
   # Pré: usuário gravou uma caminhada em outro app conectado a HC
   # No Ouroboros: navega Saúde Física → Evolução → seção "Importados de HC"
   # Confirma que o registro externo aparece com label de origem do app
   ```

6. **Smoke + testes:**
   ```bash
   ./scripts/smoke.sh        # 1892+18 testes verde (esperado +N)
   npx jest tests/lib/health # 3 suites passa
   npx tsc --noEmit          # silent
   ```

## Riscos identificados (mitigação descrita)

| Risco | Mitigação |
|-------|-----------|
| Pacote npm requer `compileSdk` específico que conflita com nosso | Validar em primeiro commit; se conflito, downgrade temporário para HC stub |
| HyperOS Xiaomi pode não suportar HC nativo até Android 15 | Fallback: detectar `getSdkStatus()=unavailable` e mostrar card "Disponível em Android 14+" em vez de quebrar UI |
| Permissões sensíveis exigem racional UI | Tela `health-rationale.tsx` já no escopo, mas validar Google Play Store policy (mesmo em alpha) |
| OEMs MIUI bloqueiam intent receivers em background | Não usamos background sync nesta sprint — só on-demand pull. Mitigado por design |

## Sub-sprints (caso seja necessário fatiar)

- **Q17.a** — Setup pacote + AndroidManifest + tela `/settings/integracoes`
- **Q17.b** — Sincronização read-only (Step, Weight, Exercise)
- **Q17.c** — Write (Exercise via Q11.c executor, Weight via Medida save)
- **Q17.d** — Ciclo menstrual (sensitive, requer rationale UI completa)

## Critérios de aceite

- [ ] Ouroboros aparece em Conexão Saúde do Android nativo
- [ ] Tela `/settings/integracoes` lista o card HC com status real
- [ ] Solicitar permissão → sheet sistema abre → aceitar → permission listada
- [ ] Salvar treino no app → record em HC visível em outro app de saúde
- [ ] Caminhada externa (Mi Fit) → aparece em Saúde Física → Evolução
- [ ] Negar permissão → app não trava, mostra fallback "Conexão pendente"
- [ ] 1892 testes Jest mantidos + ≥10 testes novos da camada `lib/health/`
- [ ] Push automático em `main` (smoke verde)
- [ ] Sprint marcada `[ok]` em `ROADMAP.md` e `FEATURES-CANONICAS.md`

## Referências externas

- https://developer.android.com/health-and-fitness/guides/health-connect
- https://github.com/matinzd/react-native-health-connect
- Permissions reference: https://developer.android.com/reference/androidx/health/connect/client/permission/HealthPermission
- Migration guide HC 1.0 → 1.1: https://developer.android.com/health-and-fitness/guides/health-connect/migrate

## Anti-débito

Achados colaterais durante esta sprint viram sub-sprint imediata
(via `/planejar-sprint` ou comentário em ROADMAP marcado `[todo]`).
Zero "issue depois". Lista mantida em
`docs/auditoria-q17/COLATERAIS.md` se houver mais de 3.
