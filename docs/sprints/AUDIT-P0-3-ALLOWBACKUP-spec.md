# AUDIT-P0-3-ALLOWBACKUP — desativar o android auto backup para o vault não sair do dispositivo

```
STATUS:     materializada 2026-07-28 (achado [P0-3] da auditoria de 2026-07-28)
PRIORIDADE: alta (dado sensível do vault sobrevive a desinstalação e
            contradiz, na prática, a política de privacidade publicada)
DEPENDE:    nenhuma
ORIGEM:     achado [P0-3] da auditoria de 2026-07-28. Verificado por leitura
            de app.json, node_modules/@expo/config-plugins/build/android/
            AllowBackup.js, src/lib/vault/permissions.ts,
            public/privacy.html e src/lib/stores/persist.ts.
```

## Problema (fix de 1 linha, cadeia de causa em 4 arquivos)

`app.json` não define `allowBackup` em nenhum lugar do bloco `expo.android`
(`grep -n "allowBackup" app.json` → 0 ocorrências). Isso não é neutro: o
próprio pipeline de build do Expo trata a ausência como uma escolha ativa.

`node_modules/@expo/config-plugins/build/android/AllowBackup.js:25-28`:

```js
function getAllowBackup(config) {
  // Defaults to true.
  // https://docs.expo.dev/versions/latest/config/app/#allowbackup
  return config.android?.allowBackup ?? true;
}
```

e `setAllowBackup` (mesmo arquivo, linha 30-34) escreve o resultado direto no
manifesto gerado: `mainApplication.$['android:allowBackup'] =
String(allowBackup)`. Ou seja, na ausência da chave em `app.json`, o build
grava ativamente `android:allowBackup="true"` no `AndroidManifest.xml` final
— não é um default passivo do sistema operacional, é um valor positivo
escrito pelo próprio pipeline do projeto a cada build.

Com `allowBackup="true"`, o Android inclui no Auto Backup (Google Drive,
execução automática pelo sistema, tipicamente com o aparelho ocioso, em wifi
e carregando) tudo que estiver no diretório interno do app — e é exatamente
onde o Vault vive por padrão. `src/lib/vault/permissions.ts:86-90`
(`sugestaoVaultPathDefault`) e `:96-100` (`sugestaoVaultUriDefault`):

```ts
export function sugestaoVaultPathDefault(): string {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return '/data/user/0/com.ouroboros.mobile/files/Ouroboros/';
  const path = docDir.replace(/^file:\/\//, '');
  return `${path}Ouroboros/`;
}
```

`FileSystem.documentDirectory` resolve para `/data/user/0/
com.ouroboros.mobile/files/Ouroboros/` — exatamente `getFilesDir()`, a pasta
que o Android Auto Backup varre. O comentário das linhas 67-73 do mesmo
arquivo já explica por que o Vault mora ali (expo-file-system bloqueia writes
fora de `filesDir`/`cacheDir`/pasta externa do app mesmo com
`MANAGE_EXTERNAL_STORAGE` concedida), mas não menciona a implicação de
backup — a decisão de onde gravar foi tomada por uma restrição técnica
diferente, e a exposição ao Auto Backup ficou como efeito colateral não
avaliado.

`public/privacy.html:27`:

> "Resumo em uma frase: o Ouroboros não envia seus dados para nenhum servidor
> próprio. Tudo o que você registra fica em arquivos no seu dispositivo, sob
> seu controle direto."

Com `allowBackup` no default, essa frase é imprecisa: existe uma cópia fora
do dispositivo físico (no Google Drive do próprio usuário), gerada sem ação
explícita dele, sempre que o Android decidir rodar o backup automático.

Ironia estrutural: `src/lib/stores/persist.ts:1-7`, o adapter SecureStore
usado pelas 8 stores do projeto, já documenta a preocupação certa:

> "Em mobile (Android/iOS), SecureStore criptografa em hardware-backed
> keystore (Android EncryptedSharedPreferences, iOS Keychain) evitando
> vazamento por backup automático."

O raciocínio foi aplicado às stores (nomes, tokens — que o Auto Backup não
alcança, por estarem em keystore) e nunca estendido ao Vault, que é
exatamente o dado mais sensível do app (diário, humor, ciclo menstrual,
medidas) e o único que, hoje, o Auto Backup alcança de fato.

**Proporção honesta (importante não exagerar nem minimizar):** o destino do
backup é o Google Drive **do próprio usuário** — conta pessoal dele, quota
separada de app data, não é enviado a nenhum servidor do projeto nem de
terceiro. A partir do Android 9 (API 28; `minSdkVersion` do projeto é 26,
então só os aparelhos 26/27 — hoje residuais — ficam de fora dessa camada),
o Google cifra o backup do lado do cliente com uma chave derivada do PIN,
padrão ou senha de tela do usuário, que nem o próprio Google consegue ler.
Isto não é vazamento para terceiro. O problema é estrutural, não é de
confidencialidade perante o mantenedor do projeto: (a) cria uma cópia fora
do dispositivo físico que sobrevive à desinstalação — contradiz literalmente
"fica no seu dispositivo, sob seu controle direto"; (b) essa cópia é
restaurada automaticamente em qualquer aparelho novo logado na mesma conta
Google, um caminho de sincronização paralelo que o app nunca pediu
consentimento explícito para criar; (c) em aparelho sem PIN/padrão/senha de
tela configurado, o backup não ganha essa camada adicional de cifra.

## Escopo (mínimo)

1. `"allowBackup": false` em `app.json`, dentro do bloco `expo.android`,
   junto às outras flags booleanas já presentes ali
   (`edgeToEdgeEnabled`/`predictiveBackGestureEnabled`, linhas 31-32).
2. Avaliar — documentar a decisão, não necessariamente implementar nesta
   sprint — `dataExtractionRules` (Android 12+/API 31, formato atual) e
   `fullBackupContent` (API 23-30, formato legado) como alternativa granular
   a um `allowBackup:false` total, que excluiria só a pasta do Vault e
   deixaria preferências não sensíveis elegíveis a backup. O
   `@expo/config-plugins` embutido só expõe a chave simples `allowBackup`
   (confirmado por leitura do módulo inteiro) — a via granular exigiria um
   config-plugin próprio, no padrão já usado por `modules/
   widget-homescreen/app.plugin.js` e `modules/health-connect/app.plugin.js`,
   injetando um XML de regras + o atributo correspondente no manifesto.
   Registrar como NÃO-objetivo desta sprint: o fix de 1 linha é proporcional
   ao risco imediato; a granularidade fica como melhoria futura, só se o
   dono decidir que vale preservar backup de configurações não sensíveis.
3. Teste que trave a regra: novo `tests/config/app.config.test.ts`
   (precedente direto em `tests/config/pessoas.config.test.ts`, mesmo
   padrão de import + assert), lendo `app.json` e afirmando
   `expo.android.allowBackup === false` — trava regressão caso a chave seja
   removida ou revertida no futuro sem que ninguém perceba.
4. Verificar o impacto na expectativa de restauração do usuário ao trocar de
   aparelho. Hoje, com o default `true`, um usuário que troca de celular e
   loga na mesma conta Google **pode** (não é garantido — depende de o
   Android ter rodado o backup antes da desinstalação) recuperar o Vault sem
   ação explícita. Depois do fix, isso deixa de acontecer — mas nenhum
   caminho de migração real se perde, porque dois já existem e continuam
   intactos:
   - **Export manual completo** — `src/lib/services/exportarVault.ts`
     (cabeçalho do arquivo: ZIP com todos os `.md`, todos os binários com
     bytes preservados, companion files de mídia, cache e snapshot de
     settings/identidade, mais `MANIFEST.json` com sha256 por arquivo para
     validar no restore) exposto em `app/settings/vault.tsx` — o próprio
     comentário do arquivo (linhas 12, 176) já chama isso de "exporta ZIP,
     importa no novo" como "diagonal explícita" para troca de pasta/aparelho,
     e a UI (linha 212) instrui o usuário a "exporte um backup pela tela
     anterior antes de trocar."
   - **Syncthing** — sincronização contínua entre os próprios dispositivos
     do usuário, já documentada em `docs/FEATURES-CANONICAS.md` seção 14
     ("Compartilhamento via Syncthing — M38, 4 dispositivos").
   Nenhum caminho de migração legítimo desaparece — só o caminho implícito e
   não documentado via Google Backup deixa de existir.
5. NÃO-objetivo: implementar `dataExtractionRules`/`fullBackupContent`
   customizado nesta sprint (ver item 2); mudar o local físico do Vault
   (`documentDirectory` continua correto pelas razões já documentadas em
   `permissions.ts:67-73` — a restrição é do `expo-file-system`, não do
   backup); reescrever `public/privacy.html` (o fix torna a frase da linha
   27 verdadeira de novo, sem precisar alterá-la).

Esta sprint não toca nenhuma tela nem componente visual — `allowBackup` é um
atributo do `AndroidManifest.xml` gerado no build nativo, invisível ao
bundle JS e ao target web. Por isso não há caso E2E Playwright nem
`docs/FEATURES-CANONICAS.md` a atualizar: nenhum comportamento observável
pelo usuário dentro do app muda (a mudança é sobre o que sobrevive fora do
app, no nível do sistema operacional).

## Proof-of-work

```bash
grep -n "allowBackup" app.json                    # "allowBackup": false

npm test -- app.config                            # teste novo (tests/config/app.config.test.ts) verde
npx --no-install tsc --noEmit                      # exit 0
./scripts/smoke.sh                                 # verde

npx expo prebuild --platform android --no-install && \
  grep -n "android:allowBackup" android/app/src/main/AndroidManifest.xml
# android:allowBackup="false"
```

## Commit

```
fix: desativa allowbackup no manifesto android para o vault nao sair do dispositivo
```
