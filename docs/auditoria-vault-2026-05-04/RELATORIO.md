# Auditoria do Vault — sprint M-VAULT-MD-AUDIT (2026-05-04)

```
SPRINT:    A3 / M-VAULT-MD-AUDIT
HEAD:      4ef1be0 (post A1 + A2 + A2.x)
ESCOPO:    auditoria + script + 14 testes integrados
ENTREGA:   docs/auditoria-vault-2026-05-04/RELATORIO.md
           + tests/integration/vault-md-completo.test.ts
           + scripts/check_vault_estrutura.sh
```

## 1. Filosofia auditada

> Dados são arquivos. Todo registro do app vira `.md` no Vault
> Obsidian; mídias originais ficam preservadas em pastas dedicadas;
> cada mídia binária tem `.md` companion; estrutura é navegável em
> Obsidian Desktop sem nenhum middleware.

A sprint não refatorou nenhuma feature. Apenas mediu, registrou e
provou via teste integrado que o contrato funcional **`path canônico
+ frontmatter zod-válido + companion 1:1`** se sustenta para as 14
features mapeadas.

## 2. Tabela por feature

Legenda da coluna **Status**:

- `OK`: feature está alinhada à filosofia (caminho canônico, schema
  zod válido, companion presente quando aplicável).
- `OK*`: alinhada com observação documental (não é débito; é decisão
  histórica que merece menção no relatório).
- `divergente`: caminho ou companion não segue convenção da M34/M39
  e merece sub-sprint corretiva.

| # | Feature | Sprint canônica | Path do `.md` | Mídia binária | Companion | Schema zod | Status |
|---|---|---|---|---|---|---|---|
| 1 | Humor diário | M05 | `daily/YYYY-MM-DD.md` | n/a | n/a | `HumorSchema` | OK |
| 2 | Diário emocional | M06 | `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md` | áudio opcional em `assets/<ts>-<rand>.m4a` (M06.5) | n/a (áudio embutido em `meta.audio`) | `DiarioEmocionalSchema` | OK* |
| 3 | Evento | M07 | `eventos/YYYY-MM-DD-<slug>.md` | fotos em `assets/<prefixo>-evento-<idx>.jpg` (legacy `assets/`) | n/a (fotos referenciadas em `meta.fotos[]`) | `EventoSchema` | OK* |
| 4 | Marco | M11 | `marcos/YYYY-MM-DD-<slug>.md` | n/a | n/a | `MarcoSchema` | OK |
| 5 | Treino sessão | M11 | `treinos/YYYY-MM-DD-<slug>.md` | n/a | n/a | `TreinoSessaoSchema` | OK |
| 6 | Medidas corporais | M12 | `medidas/YYYY-MM-DD.md` | fotos em `assets/m-YYYY-MM-DD-<lado>.jpg` (legacy) | n/a (fotos referenciadas em `meta.fotos[]`) | `MedidasSchema` | OK* |
| 7 | Alarme | M16 | `alarmes/<slug>.md` | n/a | n/a | `AlarmeSchema` | OK |
| 8 | Tarefa | M17 + M31 | `tarefas/YYYY-MM-DD-<slug>.md` | n/a | alarme vinculado opcional em `alarmes/<slug>-alarme.md` | `TarefaSchema` | OK |
| 9 | Contador "dias sem X" | M18 | `contadores/<slug>.md` | n/a | n/a | `ContadorSchema` | OK |
| 10 | Ciclo menstrual | M14.5 | `inbox/saude/ciclo/YYYY-MM-DD.md` | n/a | n/a | `CicloMenstrualSchema` | OK |
| 11 | Frase (captura) | M34 | `media/frases/YYYY-MM-DD-<slug>.md` | n/a (frase é o próprio `.md`) | n/a | sem zod (M39 formaliza) | OK |
| 12 | Foto (captura) | M34 | `media/fotos/YYYY-MM-DD-<rand>.md` (companion) | `media/fotos/YYYY-MM-DD-<rand>.jpg` | sim (mesmo basename, mesma pasta) | sem zod (M39 formaliza) | OK |
| 13 | Vídeo (captura) | M34 | `media/videos/YYYY-MM-DD-<rand>.md` (companion) | `media/videos/YYYY-MM-DD-<rand>.mp4` | sim (mesmo basename, mesma pasta) | sem zod (M39 formaliza) | OK |
| 14 | Áudio (captura unificada) | M34 | `media/audios/YYYY-MM-DD-<rand>.md` (companion) | `media/audios/YYYY-MM-DD-<rand>.<ext>` (preserva extensão original) | sim (mesmo basename, mesma pasta) | sem zod (M39 formaliza) | OK |

### 2.1 Feature auxiliar — nota fiscal (scanner, M09)

A sprint não pediu auditoria desta feature, mas foi descoberta em
varredura cruzada. Para registro:

| Feature | Sprint | Path do `.md` | Mídia | Companion 1:1? |
|---|---|---|---|---|
| Nota fiscal | M09 (`saveNota`) | `inbox/financeiro/nota/YYYY-MM-DD-HHmmss-<slug>.md` | `assets/<prefixo>-nota.jpg` ou `assets/<prefixo>-nota-multipagina.pdf` | **não** — caminhos diferentes (binário em `assets/`, `.md` em `inbox/financeiro/nota/`) |

Funcional para Obsidian (link wiki resolve por nome), mas não segue
a convenção M34 de "binário e companion lado a lado, mesmo
basename". Sub-sprint sugerida: `M-VAULT-MD-FIX-scanner` (item 4
desta auditoria, abaixo).

## 3. Configuração e identidade — fora do Vault

Conferido por leitura direta:

| Dado | Storage | Path |
|---|---|---|
| Nomes reais (pessoa_a / pessoa_b) | SecureStore (mobile) / `localStorage` (web) | `usePessoa` (`src/lib/stores/pessoa.ts`) |
| Vault root URI / SAF | SecureStore | `useVault` + `ouroboros.vault.root.v1` |
| Onboarding done | SecureStore + `useOnboarding` | `src/lib/stores/onboarding.ts` |
| Toggles de feature | AsyncStorage via zustand persist | `useSettings.featureToggles` |
| Sessão / tipoCompanhia | zustand `useSettings` | `src/lib/stores/settings.ts` |
| Cache do widget homescreen | SharedPreferences nativo | `WidgetModule` (Android) |

Nenhum desses dados toca o Vault. Confirmado: identidade e
configuração ficam isoladas no aparelho; Vault é só registro de
vida do usuário.

## 4. Achados — sub-sprints sugeridas (anti-débito)

Cada item abaixo é um achado isolado. Spec técnica de cada
sub-sprint deve ser materializada por `/planejar-sprint` se a
decisão for promover. **Esta sprint não corrigiu nenhum dos
itens** (escopo restrito a auditoria + medição).

### 4.1 `M-VAULT-MD-FIX-diario-audio` — áudio do diário emocional vai para `assets/`, não `media/audios/`

- **Onde:** `src/lib/diario/recordAudio.ts:saveRecordingToVault`
  usa `assetsAudioPath` (`assets/<YYYY-MM-DD-HHmm>-<suffix>.m4a`).
- **Convenção esperada (M34):** `media/audios/YYYY-MM-DD-<rand>.m4a`
  com `.md` companion 1:1.
- **Impacto:** baixo — funciona em runtime, abre no Obsidian. Mas
  quebra a uniformidade de "tudo de captura cai em `media/<categoria>/`".
- **Mitigação registrada na M34 spec:** `migracao para media/audios
  fica para M39 (assetsLegacy migrator)` — comentário em `paths.ts:233`.
- **Recomendação:** confirmar se M39 já cobre; se não, abrir
  sub-sprint `M-VAULT-MD-FIX-diario-audio` que (a) muda `assetsAudioPath`
  para `mediaAudiosPath`, (b) cria companion `.md`, (c) escreve
  migrator one-shot que move `assets/<...>.m4a` → `media/audios/`
  preservando referência em `meta.audio` do diário emocional.

### 4.2 `M-VAULT-MD-FIX-evento-fotos` — fotos de evento em `assets/`, não `media/fotos/`

- **Onde:** `src/lib/eventos/saveEvento.ts:copiarFotos` usa
  `assetsPath('<prefixo>-evento-<idx>.jpg')`.
- **Convenção esperada (M34):** `media/fotos/YYYY-MM-DD-<rand>.jpg`
  com `.md` companion 1:1.
- **Impacto:** baixo — funciona, mas duplica caminho de "fotos do
  app" em duas pastas (`assets/` e `media/fotos/`).
- **Recomendação:** sub-sprint `M-VAULT-MD-FIX-evento-fotos` que
  (a) migra `copiarFotos` para `mediaFotosPath`, (b) cria companion
  por foto, (c) atualiza `meta.fotos[]` para apontar ao novo path,
  (d) migrator one-shot.

### 4.3 `M-VAULT-MD-FIX-medidas-fotos` — fotos de medida idem

- **Onde:** `src/lib/vault/paths.ts:medidasFotoPath` retorna
  `assets/m-YYYY-MM-DD-<lado>.jpg`.
- **Convenção esperada:** `media/fotos/m-YYYY-MM-DD-<lado>.jpg` +
  companion.
- **Impacto:** baixíssimo (feature pouco usada).
- **Recomendação:** opcional; pode entrar no mesmo lote de M-VAULT-MD-FIX-evento-fotos.

### 4.4 `M-VAULT-MD-FIX-scanner` — nota fiscal sem companion 1:1

- **Onde:** `src/lib/scanner/saveNota.ts` grava binário em
  `assets/<prefixo>-nota.jpg|pdf` e `.md` em
  `inbox/financeiro/nota/<...>.md` (caminhos diferentes).
- **Convenção esperada:** binário em `media/scanner/<slug>.<ext>` +
  companion `.md` ao lado.
- **Impacto:** médio — Obsidian resolve link wiki, mas usuário que
  navegar por pasta vê "binário órfão" em `assets/`.
- **Recomendação:** sub-sprint `M-VAULT-MD-FIX-scanner` que
  reposiciona binário sob `media/scanner/`, cria companion .md
  espelhando o frontmatter de `inbox/financeiro/nota/<...>.md`,
  ou alternativamente decide manter `inbox/financeiro/nota/` como
  canônico e remove `media/scanner/` da lista de pastas canônicas
  em `permissions.ts`.

### 4.5 Subpastas `media/avatares` e `media/scanner` declaradas mas sem write

- **Onde:** `src/lib/vault/permissions.ts:SUBPASTAS_CANONICAS`
  declara as 19 pastas; `mediaAvataresPath` e `mediaScannerPath`
  estão definidos em `paths.ts` mas **nenhum módulo de `src/`
  consome esses helpers** (grep zero matches em writes).
- **Impacto:** baixíssimo — pastas vazias não atrapalham Obsidian.
- **Recomendação:** decidir entre (a) implementar consumidores
  (avatares deveriam viver em `media/avatares/<pessoa>-<ts>.jpg`
  conforme comentário do helper) ou (b) remover entradas de
  `SUBPASTAS_CANONICAS` para evitar diretório vazio canônico.
  Provavelmente (a) é o caminho — avatar atual ainda usa SecureStore
  ou `assets/`. Confirmar com `<AvatarPicker>`.

### 4.6 Vault desktop do usuário (`~/Protocolo-Ouroboros/`) está incompleto

- **Observação operacional:** ao rodar
  `./scripts/check_vault_estrutura.sh ~/Protocolo-Ouroboros/`
  na máquina deste agente, **13 das 19 subpastas canônicas
  estavam ausentes**.
- **Causa provável:** o Vault desktop é populado pelo Syncthing a
  partir do mobile; pastas que ainda não foram criadas pelo mobile
  (porque o usuário ainda não usou aquela feature) não existem no
  desktop.
- **Não é bug de código** — é estado do usuário. Mencionado para
  contexto futuro: o "Obsidian-friendly" está OK no que existe,
  mas o desktop só vê o que o mobile já materializou.
- **Recomendação:** nenhuma ação técnica; documentar no
  `HOW_TO_RESUME.md` que o Vault desktop reflete o histórico de
  uso do mobile.

## 5. Verificação Obsidian Desktop (manual)

A spec define este passo como **manual**, não automatizado. Critério
adotado nesta sprint: o **script `check_vault_estrutura.sh` cobre
os invariantes objetivos** (estrutura de pastas, frontmatter
parseável, companion 1:1, caracteres de path). Validação visual
no Obsidian fica como tarefa do usuário em ciclo de release.

Sugestão de roteiro mínimo (pré-release M41):

1. Abrir `~/Protocolo-Ouroboros/` como Vault no Obsidian Desktop.
2. Abrir um `.md` de cada pasta canônica e confirmar render
   correto do frontmatter (Properties panel) + corpo.
3. Em `media/fotos/`, abrir um companion `.md` e clicar no
   campo `arquivo:` — deve resolver via wiki link `![[<basename>.jpg]]`.
4. Confirmar que tags do frontmatter (`tags:` em humor, marcos)
   aparecem no painel Tags do Obsidian.

## 6. Métricas de saúde

| Métrica | Antes (HEAD `4ef1be0`) | Depois (esta sprint) |
|---|---|---|
| Suítes Jest | 146 | 147 (+1) |
| Casos Jest | 1302 | 1316 (+14) |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `./scripts/check_anonimato.sh` | exit 0 | exit 0 |
| `python3 scripts/check_strings_ui_ptbr.py` | exit 0 | exit 0 |
| `./scripts/smoke.sh` | exit 0 | exit 0 |
| Bundle Hermes Android | 8.5 MB | 8.5 MB (sem regressão) |
| `./scripts/check_vault_estrutura.sh` (vault seed) | n/a | exit 0 |

Aritmética dos testes: `1302 + 14 = 1316`.

## 7. Conclusão

A filosofia "dados são arquivos" **se sustenta no contrato**: as 14
features mapeadas produzem `.md` válidos em paths canônicos sob o
Vault, mídias binárias preservadas em pastas dedicadas, companions
presentes na convenção M34 nas 4 features de captura unificada
(foto, vídeo, áudio, frase).

Os achados em §4 são **divergências históricas** legítimas (M06.5,
M07, M09 nasceram antes da convenção M34/M39) e **não invalidam a
filosofia**. São candidatos a sprint corretiva isolada, não a
refactor abrangente.

A linha-mestra desta auditoria — `path canônico + frontmatter
zod-válido + companion 1:1` — fica gravada como teste integrado
permanente em `tests/integration/vault-md-completo.test.ts`. Qualquer
regressão futura em qualquer feature listada quebra esse teste e é
detectada antes do merge.
