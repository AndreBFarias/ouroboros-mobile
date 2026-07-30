# Armadilhas de Runtime — Catálogo Canônico

Catálogo de armadilhas reais encontradas em runtime neste projeto
(React Native + Expo SDK 54, Android-first): build, bundler, testes,
Web, OEMs Android, vault, OAuth, animações e persistência. Cada entrada
registra sintoma, causa raiz e correção adotada.

**Este arquivo é a fonte pública canônica do catálogo.** Antes dele o
material vivia apenas em notas de processo não versionadas. Sprints,
specs e comentários de código citam as armadilhas pelo número (por
exemplo, `babel.config.js` cita "Armadilha A1"), portanto:

- **A numeração é estável e citável.** Nunca renumerar, nunca reordenar
  números, nunca reciclar um número aposentado.
- **Nunca remover uma entrada.** Armadilha corrigida continua no
  catálogo, porque o valor está no diagnóstico e na causa raiz — que
  reincidem. Quando o contexto muda (arquivo movido, API trocada,
  decisão revertida), acrescenta-se uma linha `Estado:` à entrada.

## Como acrescentar uma armadilha nova

1. Use o **próximo número livre** (hoje, `A48`).
2. Copie a estrutura das entradas existentes: heading `## A<N> — <título
   curto>`, linha `**Área:**`, e depois `**Sintoma:**`, `**Causa
   raiz:**`, `**Correção:**` e, quando útil, `**Diagnóstico rápido:**`,
   `**Não-fix:**` e `**Origem:**`.
3. Acrescente a linha correspondente na tabela de índice.
4. Preserve `arquivo:linha` sempre que existir — mesmo que a linha
   envelheça, o arquivo orienta a busca.
5. Só entra aqui o que foi **observado em runtime ou em build real**.
   Hipótese não verificada não entra.

## Nota sobre a origem e a integridade da numeração

A faixa `A1`–`A47` está **completa**: não há lacuna de numeração. No
material de origem duas entradas apareciam fora de ordem (`A29` depois
de `A31`, e `A39` depois de `A40`), provável artefato de sprints
paralelas. Aqui elas estão em ordem crescente, com os números
originais intactos.

Entradas cujo texto original citava ferramentas de desenvolvimento
assistido foram reescritas em termos funcionais ("automação de
browser", "varredura automatizada", "automação externa"). Nenhum
conteúdo técnico foi perdido nessa reescrita.

---

## Índice

| Nº | Título curto | Área afetada |
|----|--------------|--------------|
| [A1](#a1--ordem-do-plugin-de-worklets-no-babel) | Ordem do plugin de worklets no Babel | Build / Babel / animações |
| [A2](#a2--saf-do-android-13-exige-permissão-de-diretório-no-onboarding) | SAF exige permissão de diretório no onboarding | Android / armazenamento |
| [A3](#a3--ml-kit-exige-dev-client) | ML Kit exige dev-client | Build / módulos nativos |
| [A4](#a4--mediatypeoptions-deprecado-no-expo-image-picker) | `MediaTypeOptions` deprecado no image-picker | Mídia |
| [A5](#a5--conflito-de-sincronização-entre-dois-aparelhos-no-mesmo-daily) | Conflito de sync entre dois aparelhos | Sync / vault |
| [A6](#a6--image-do-rn-cacheia-recurso-por-uri) | `<Image>` cacheia recurso por URI | UI / mídia |
| [A7](#a7--nativewind-4-e-ordem-dos-plugins-de-babel) | NativeWind 4 e ordem dos plugins | Build / Babel |
| [A8](#a8--versões-reais-adotadas-divergem-do-briefing) | Versões reais divergem do briefing | Dependências |
| [A9](#a9--eslint-v9-usa-flat-config) | ESLint v9 usa flat config | Lint / hooks |
| [A10](#a10--peer-deps-de-gluestack-conflitam-com-react-19) | Peer deps de gluestack vs React 19 | Dependências |
| [A11](#a11--peer-deps-explícitas-exigidas-pelo-sdk-54) | Peer deps explícitas do SDK 54 | Dependências |
| [A12](#a12--jestsetup-precisa-ter-extensão-cjs) | `jest.setup` precisa ser `.cjs` | Jest |
| [A13](#a13--react-test-renderer-exige-versão-exata) | `react-test-renderer` exige versão exata | Jest |
| [A14](#a14--importmeta-quebra-o-bundle-web) | `import.meta` quebra o bundle Web | Metro / Web |
| [A15](#a15--securestore-não-tem-implementação-web) | SecureStore não tem implementação Web | Web / stores |
| [A16](#a16--appearancesetcolorscheme-não-existe-no-rn-web) | `Appearance.setColorScheme` ausente no Web | Web / tema |
| [A17](#a17--bottom-sheet-não-anima-no-rn-web-com-reanimated-4) | Bottom-sheet não anima no RN Web | Web / UI |
| [A18](#a18--bottom-sheet-sem-screen-opaco-vira-tela-preta-infinita) | Bottom-sheet sem `<Screen>` vira tela preta | UI / Android |
| [A19](#a19--scoped-storage--oems-agressivos-negam-write-mesmo-com-permissão) | Scoped Storage + OEMs negam write | Vault / Android |
| [A20](#a20--securestore-android-tem-limite-de-2kb-por-valor) | Limite de ~2KB por valor no SecureStore | Armazenamento |
| [A21](#a21--oauth-com-scheme-custom-exige-dois-clientid) | OAuth com scheme custom exige dois clientId | OAuth |
| [A22](#a22--mock-de-react-native-worklets-incompleto) | Mock de `react-native-worklets` incompleto | Jest |
| [A23](#a23--weboutput-static-quebra-no-ssr-por-framer-motion--tslib) | `web.output: static` quebra no SSR | Build / Web |
| [A24](#a24--regex-literal-com-classe---quebra-o-export-android) | Regex literal com classe quebra o export | Build / NativeWind |
| [A25](#a25--package-exports-do-metro-vs-imports-relativos-sem-extensão) | Package exports vs imports relativos | Metro |
| [A26](#a26--nome-do-plugin-de-worklets--expo-dev-client-em-plugins) | Nome do plugin + `expo-dev-client` em `plugins[]` | Build |
| [A27](#a27--react-native-svg-no-fabric-exige-arrays) | `react-native-svg` no Fabric exige arrays | UI / SVG / New Arch |
| [A28](#a28--motiview-no-boot-path-crasha-no-new-arch) | `MotiView` no boot path crasha | Animações / New Arch |
| [A29](#a29--hardcode-de-vault_path--trailing-space-do-saf) | Hardcode de `VAULT_PATH` + trailing space SAF | Vault |
| [A30](#a30--bottom-sheet-renderiza-offscreen-no-fabric-com-index-inicial-0) | Bottom-sheet offscreen no Fabric | UI / New Arch |
| [A31](#a31--expo-file-system-bloqueia-writes-na-raiz-de-sdcard) | `expo-file-system` bloqueia writes em `/sdcard/` | Vault / Android |
| [A32](#a32--hyperos--miui-bloqueia-adb-install--r) | HyperOS/MIUI bloqueia `adb install -r` | Device / ADB |
| [A33](#a33--w-10-no-header-corta-o-slot-direito) | `w-10` no Header corta o slot direito | UI |
| [A34](#a34--button-genérico-com-motiview-colapsa-flex-row) | `Button` com `MotiView` colapsa flex row | UI |
| [A35](#a35--coordenadas-do-adb-tap-vs-screencap-escalado) | Coords do `adb tap` vs screencap escalado | Device / ADB |
| [A36](#a36--anr-sem-toast-indica-crash-js-antes-do-error-boundary) | ANR sem toast indica crash JS | Device / diagnóstico |
| [A37](#a37--build-de-dev-client-na-fila-do-serviço-demora-10-25-min) | Build de dev-client demora na fila | Build / CI |
| [A38](#a38--quota-mensal-android-do-plano-gratuito-esgota) | Quota mensal do plano gratuito esgota | Build / CI |
| [A39](#a39--envjson-gitignored-quebra-o-build-no-ci) | `env.json` gitignored quebra o CI | CI |
| [A40](#a40--osc-9-vaza-em-terminal-sem-suporte-e-quebra-o-raw-mode-do-tty) | OSC 9 vaza em terminal sem suporte | Ambiente de desenvolvimento |
| [A41](#a41--bootstrap-incompleto-de-cópia-de-trabalho-envjson-env-node_modules) | Bootstrap incompleto de cópia de trabalho | Ambiente / Jest |
| [A42](#a42--metro-do-gauntlet-morre-pós-bundle-sem-bindar-a-porta) | Metro morre pós-bundle sem bindar a porta | DX / Metro |
| [A43](#a43--jestdomock-virtual-colide-com-módulo-em-symlink) | `jest.doMock` virtual colide com symlink | Jest |
| [A44](#a44--seis-incompatibilidades-de-infra-no-expo-sdk-56) | Seis incompatibilidades no SDK 56 | Build / Jest |
| [A45](#a45--ci-verde-não-prova-que-o-app-sobe-no-device) | CI verde não prova boot no device | CI / release |
| [A46](#a46--captureref-lança-nullpointerexception-em-árvore-com-reanimated-no-fabric) | `captureRef` lança NPE no Fabric | Mídia / New Arch |
| [A47](#a47--zustand-persist-com-merge-shallow-não-back-filla-chave-nested-nova) | `persist` shallow não back-filla chave nested | Stores / persistência |

---

## A1 — Ordem do plugin de worklets no Babel

**Área:** build / Babel / animações

**Sintoma:** springs falham silenciosamente — sem erro, sem warning, a
animação simplesmente não acontece.

**Causa raiz:** o plugin de worklets (`react-native-reanimated/plugin`
no Reanimated 3; `react-native-worklets/plugin` a partir do Reanimated
4 — ver A26) transforma as funções de worklet. Se não for o **último**
plugin de `babel.config.js`, outro plugin reescreve o código antes e a
transformação não casa.

**Correção:** manter o plugin de worklets sempre na última posição do
array `plugins` de `babel.config.js`.

## A2 — SAF do Android 13+ exige permissão de diretório no onboarding

**Área:** Android / armazenamento

**Sintoma:** escrita no diretório escolhido falha em Android 13+ sem
diálogo visível para o usuário.

**Correção:** chamar
`StorageAccessFramework.requestDirectoryPermissionsAsync` durante o
onboarding, antes de qualquer escrita, e persistir o tree URI
concedido.

## A3 — ML Kit exige dev-client

**Área:** build / módulos nativos

**Sintoma:** OCR e reconhecimento de voz não funcionam no cliente Expo
padrão.

**Causa raiz:** ML Kit traz código nativo que não está embutido no app
cliente genérico; exige `expo-dev-client` (build próprio com
autolinking).

**Correção:** rodar as telas que dependem de ML Kit somente em
dev-client ou release. Aplicável às sprints M06.5 e M09.

## A4 — `MediaTypeOptions` deprecado no expo-image-picker

**Área:** mídia

**Sintoma:** warning verboso no console; a API foi removida no SDK 55.

**Correção:** usar array de `MediaType`: `mediaTypes: ['images']` em
vez de `MediaTypeOptions.Images`. Aplicado em `<AvatarPicker>`.

## A5 — Conflito de sincronização entre dois aparelhos no mesmo `daily/`

**Área:** sync / vault

**Sintoma:** arquivos de conflito criados pelo sincronizador quando os
dois aparelhos escrevem no mesmo diretório `daily/`.

**Correção:** sufixar os arquivos por pessoa — `-pessoa_a` /
`-pessoa_b` — de modo que cada aparelho escreva em nome de arquivo
próprio.

## A6 — `<Image>` do RN cacheia recurso por URI

**Área:** UI / mídia

**Sintoma:** trocar a foto de perfil mantendo o mesmo caminho não muda
a imagem exibida.

**Causa raiz:** o `<Image>` do React Native usa a URI como chave de
cache.

**Correção:** incluir timestamp ou hash no nome do arquivo —
`pessoa_a-<timestamp>.jpg`. Aplicado em `<AvatarPicker>`.

## A7 — NativeWind 4 e ordem dos plugins de Babel

**Área:** build / Babel

**Sintoma:** classes utilitárias não aplicadas, ou animações mortas
quando a ordem é invertida.

**Correção:** exigir `nativewind >= 4.0.36` e, em `babel.config.js`,
manter `nativewind/babel` **antes** do plugin de worklets. Nota: o
projeto adotou Reanimated 4.x (com peer `react-native-worklets`), não
3.x como planejado originalmente — ver A8 e A26.

## A8 — Versões reais adotadas divergem do briefing

**Área:** dependências

**Contexto:** versões efetivamente adotadas na M01.1: Expo SDK 54,
React 19.1, React Native 0.81, Reanimated 4.1, NativeWind 4.2. O
`docs/BRIEFING.md` diz "SDK 51+ / Reanimated 3", o que continua
compatível: 51+ é mínimo, não versão fixa. O Reanimated 4 introduz
`react-native-worklets` como peer separada — já instalada.

**Por que importa:** ler o briefing como pin de versão leva a downgrades
que quebram o bundle (ver A14 e A25).

## A9 — ESLint v9 usa flat config

**Área:** lint / hooks

**Sintoma:** o hook `pre-commit` chama `npx --no-install eslint
$STAGED` e falha por ausência de configuração.

**Causa raiz:** ESLint v9+ lê `eslint.config.js` (flat config), não
`.eslintrc.*`.

**Correção:** manter `eslint.config.js` na raiz. Criado na M01.1.

## A10 — Peer deps de gluestack conflitam com React 19

**Área:** dependências

**Sintoma:** resolução de dependências falha ao instalar
`@gluestack-ui/themed` (legado) com React 19.

**Correção adotada:** `.npmrc` na raiz com `legacy-peer-deps=true`.
Solução paliativa: avaliar migração antes de adotar primitivos pesados
dessa biblioteca.

## A11 — Peer deps explícitas exigidas pelo SDK 54

**Área:** dependências

**Contexto:** o SDK 54 exige peers que não constavam no spec original:
`react-dom`, `react-native-web`, `react-native-svg`,
`react-native-worklets`, `babel-preset-expo`. Todas instaladas na
M01.1.

**Regra durável:** instalar dependência do ecossistema Expo sempre com
`npx expo install <pkg>`, nunca `npm install`, para que a versão fique
alinhada ao SDK.

## A12 — `jest.setup` precisa ter extensão `.cjs`

**Área:** Jest

**Sintoma:** suítes quebram com `ReferenceError` envolvendo
`_ReactNativeCSSInterop`.

**Causa raiz:** `jest.setup.js` é transformado por `babel-preset-expo`
+ `nativewind/babel`, e o NativeWind injeta `_ReactNativeCSSInterop`
fora do escopo dos factories de `jest.mock()`.

**Correção:** renomear para `jest.setup.cjs`. O preset `jest-expo` só
transforma `\.[jt]sx?$`, então o `.cjs` passa intacto. Aplicado na
M01.3.

## A13 — `react-test-renderer` exige versão exata

**Área:** Jest

**Sintoma:** `Incorrect version of "react-test-renderer" detected`.

**Causa raiz:** `@testing-library/react-native@^13.3.3` tem peer rígida
em `react-test-renderer@19.1.0`; `npx expo install --dev
react-test-renderer` instala 19.2.5 (caret).

**Correção:** pinar com `npm install -D react-test-renderer@19.1.0
--legacy-peer-deps`. Aplicado na M01.3.

## A14 — `import.meta` quebra o bundle Web

**Área:** Metro / Web

**Sintoma:** `SyntaxError: Cannot use 'import.meta' outside a module`
no bundle Web do Expo SDK 54.

**Causa raiz:** o resolver escolhe o build ESM de pacotes que usam
`import.meta.env` (sintaxe Vite) — caso do middleware devtools do
zustand.

**Correção:** em `metro.config.js`, definir
`config.resolver.unstable_conditionNames = ['require', 'react-native',
'default']` e `unstable_enablePackageExports = true`. Aplicado no
commit `3522907`. Complemento no Babel: o plugin
`babel-plugin-transform-import-meta` converte `import.meta` em objeto
vazio, cobrindo Web e mobile.

**Não-fix:** desligar `unstable_enablePackageExports` globalmente faz o
bundle Web voltar a falhar — ver A25.

## A15 — SecureStore não tem implementação Web

**Área:** Web / stores

**Sintoma:** stores persistidas e permissão de vault quebram ao rodar
a versão Web.

**Causa raiz:** `expo-secure-store` não tem backend Web.

**Correção:** o adapter em `src/lib/stores/persist.ts` cai em
`localStorage` quando `Platform.OS === 'web'` (com guarda para
`window` indefinido). Mesma estratégia para `requestVaultPermission()`
em `src/lib/vault/permissions.ts`, que devolve URI mock
`web://mock-vault/...`.

## A16 — `Appearance.setColorScheme` não existe no RN Web

**Área:** Web / tema

**Sintoma:** erro em `app/_layout.tsx` ao forçar tema escuro na versão
Web.

**Correção:** chamar dentro de `try/catch` com optional chaining
(`Appearance.setColorScheme?.('dark')`), marcar `darkMode: 'class'` em
`tailwind.config.js` e aplicar
`document.documentElement.classList.add('dark')` quando `typeof
document !== 'undefined'`. Aplicado no commit `ce80b12`.

## A17 — Bottom-sheet não anima no RN Web com Reanimated 4

**Área:** Web / UI

**Sintoma:** com `@gorhom/bottom-sheet` v5 + Reanimated 4 + React 19 no
Web, o sheet renderiza na árvore de acessibilidade (todos os filhos
chegam ao DOM com a11y correto), mas a animação de `expand()` não é
aplicada. O container fica travado em `transform: translate(0,
viewportHeight)`, fora do viewport visível. Identificado na M05 ao
validar a Tela 15 por automação de browser em
`http://localhost:8081/humor-rapido`. **Não é bug do código de
aplicação** — a mesma tela abre normalmente em Android.

**Causa raiz empírica (M-SHEET-MODAL-SNAP, 2026-05-05):** o pacote
inicializa `animatedPosition = useSharedValue(window.height)` (linha
218 do `BottomSheet.tsx` da biblioteca) e depende de
`useAnimatedReaction` para mover o sheet à posição alvo depois que
`useDerivedValue` calcula os detents. **Em RN Web, o
`useAnimatedReaction` do Reanimated 4 não dispara confiavelmente no
mount** — o sheet permanece em `y = windowHeight`. Confirmado por
medição direta: rotas modais raiz (`humor-rapido`, `eventos`,
`diario-emocional`) que abrem com `index={0}` ficam com
`getBoundingClientRect().top === windowHeight` mesmo após 5 segundos de
espera. Conteúdo presente no DOM, sliders e formulários alcançáveis por
scroll, mas o viewport mostra apenas o `<OuroborosLoader compacto>` de
fundo (mitigação A18).

**Correção durável (M-SHEET-MODAL-SNAP):** o wrapper
`src/components/ui/BottomSheet.tsx` aplica patch de DOM automatizado
apenas quando `Platform.OS === 'web'`, após o mount e em 250/750/1500
ms. Localiza o container hospedeiro por `querySelectorAll('div')` +
match de `transform: matrix(1, 0, 0, 1, 0, ty)` com `|ty - windowH| <
24`, e seta `transform: matrix(1, 0, 0, 1, 0, windowH × (1 - snap%))`
mais `transition: none`. Em mobile real (`'android'` / `'ios'`) vira
no-op completo — a biblioteca anima normalmente. O padrão substitui o
ajuste manual por DevTools que era necessário antes.

**Validação:** `tests/e2e/playwright/m-sheet-modal-snap.e2e.ts` cobre as
três rotas modais com asserts de `ty` e da posição do primeiro slider
(`top < windowH / 2`). Para gestos e animação real, ainda é preciso
emulador Android ou aparelho físico.

## A18 — Bottom-sheet sem `<Screen>` opaco vira tela preta infinita

**Área:** UI / Android

**Sintoma:** reportado no APK v1.0.0 nas rotas `humor-rapido`,
`diario-emocional`, `eventos` e `scanner`: tela preta infinita, sem
conteúdo visível e sem botão de voltar acessível. O app parece travado.

**Causa raiz:** essas rotas renderizavam apenas `<BottomSheet
index={-1}>` direto no retorno, sem um `<Screen padded={false}>` por
trás. Quando o sheet fica abaixo do viewport (porque o `expand()`
falhou — A17 ou A30), só o backdrop preto aparece.

**Correção padrão (M26, 2026-05-03):** envolver todo BottomSheet modal
em `<Screen>`, com conteúdo de fundo visível e `index={0}` direto:

```tsx
return (
  <Screen padded={false}>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <OuroborosLoader compacto />
    </View>
    <BottomSheet
      index={0}                                  // direto, não -1 + useEffect expand
      snapPoints={SHEET_PRESETS['70']}
      onChange={idx => idx === -1 && router.back()}
    >
      {/* conteúdo */}
    </BottomSheet>
  </Screen>
);
```

Em `app/_layout.tsx`, registrar essas rotas com `presentation:
'transparentModal'` + `contentStyle: { backgroundColor: '#14151a' }`
para garantir fundo opaco mesmo se o `transparentModal` perder
estilização.

**Validação:** sprint que adicionar rota modal nova precisa testar em
emulador que, mesmo com o sheet fechado, o usuário vê algo (loader ou
logo) e tem rota de saída clara.

## A19 — Scoped Storage + OEMs agressivos negam write mesmo com permissão

**Área:** vault / Android

**Sintoma:** `inicializarVaultCanonico()` retorna sucesso na criação da
pasta, mas `writeAsStringAsync` silencia ou lança `EACCES`. Ocorre em
Android 11+ com OEMs agressivos (MIUI/Xiaomi, OneUI/Samsung) mesmo com
`MANAGE_EXTERNAL_STORAGE` concedida por Intent, ao escrever em
`/sdcard/Documents/<app>/`.

**Causa raiz:** a permissão concedida no diálogo não garante gravação
efetiva no caminho, e **em RN/Expo não existe API JS direta para
`Environment.isExternalStorageManager()`** — só via módulo nativo
(`react-native-permissions`) ou bridge própria. Portanto não há como
consultar o estado real; só como testá-lo.

**Correção obrigatória (M22):** depois de pedir permissão, executar
**probe write + read + delete** num arquivo `.ouroboros-probe` na
pasta-alvo antes de marcar `vaultRoot` como válido:

```ts
async function probeVaultWritable(vaultRoot: string): Promise<boolean> {
  const probe = `${vaultRoot}/.ouroboros-probe`;
  try {
    await FileSystem.writeAsStringAsync(probe, 'ok');
    const back = await FileSystem.readAsStringAsync(probe);
    await FileSystem.deleteAsync(probe, { idempotent: true });
    return back === 'ok';
  } catch {
    return false;
  }
}
```

Se o probe falhar, cair em SAF interativo (`requestVaultPermission()`
legado) com aviso "Seu dispositivo exige seleção manual da pasta.
Escolha `/sdcard/Documents/Ouroboros/`."

**Estado:** implementado em `src/lib/vault/permissions.ts`
(`PROBE_FILENAME` na linha 77, `probeVaultWritable` na linha 344,
chamada na linha 401). O probe hoje monta o caminho por `vaultUriJoin`
em vez de concatenação — ver A29.

**Origem:** varredura automatizada de auto-implementação da M22
(2026-05-02).

## A20 — SecureStore Android tem limite de ~2KB por valor

**Área:** armazenamento

**Sintoma:** caches grandes (lista de eventos, rascunhos longos,
snapshots) estouram silenciosamente — `setItemAsync` falha ou trunca
sem erro visível.

**Causa raiz:** o backend Android do `expo-secure-store` é
`EncryptedSharedPreferences`, com limite prático de ~2KB por valor.

**Correção obrigatória:**

- Tokens, chaves e IDs curtos (< 1KB cada): SecureStore serve.
- Caches, listas e rascunhos potencialmente grandes: gravar em arquivo
  no vault, sob `media/cache/<feature>-<scope>.json` (leitura por
  `FileSystem.readAsStringAsync`, escrita por `writeAsStringAsync`).

Aplica-se à M24 (rascunhos de formulário — limitar a 2KB ou cair em
arquivo), M37 (cache de eventos de agenda — sempre arquivo), M38
(`deviceId` — menos de 32 caracteres, SecureStore serve) e M39
(caminhos de companion — sempre arquivo).

**Origem:** varredura automatizada de auto-implementação da M37
(2026-05-02).

## A21 — OAuth com scheme custom exige dois clientId

**Área:** OAuth

**Sintoma:** o fluxo OAuth funciona em um ambiente e falha no outro,
com rejeição de redirect URI.

**Causa raiz:** `expo-auth-session` com scheme custom (`ouroboros://`)
só funciona em dev-client e em release APK. No cliente Expo genérico o
WebBrowser usa automaticamente o proxy `auth.expo.io`, que rejeita
scheme custom não registrado.

**Consequência prática:** para OAuth funcionar nos dois ambientes são
necessários **dois clientId distintos** no console do provedor:

- **clientId Web (proxy):** redirect URI
  `https://auth.expo.io/@<owner>/<slug>`. Usado no cliente genérico.
- **clientId Android (scheme custom):** SHA-1 do keystore +
  `com.ouroboros.mobile` como package; redirect URI
  `ouroboros://oauth-callback`. Usado em dev-client e release.

**Correção obrigatória (M37.1 e qualquer sprint OAuth futura):**
detectar o ambiente por `Constants.appOwnership` (`'expo'` → proxy;
`'standalone'` / `'guest'` → scheme custom) e selecionar o `clientId`
correto entre `process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` e
`EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`. O setup manual do console fica
documentado em `docs/SETUP-OAUTH-GOOGLE.md`.

**Origem:** varredura automatizada de auto-implementação da M37
(2026-05-02).

## A22 — Mock de `react-native-worklets` incompleto

**Área:** Jest

**Sintoma:** `ReferenceError` ou `TypeError: (0,
_reactNativeWorklets.createSerializable) is not a function` em
module-init, antes de qualquer teste rodar, quando algum arquivo de
`src/` importa `react-native-reanimated` **diretamente** (não via
`moti`).

**Causa raiz:** o factory `jest.mock('react-native-reanimated', () =>
require('react-native-reanimated/mock'))` carrega o `mock.ts`, que
importa de `./index`; o init de `animation/util.ts` chama
`createSerializable({...})` no carregamento do módulo.

**Correção:** o mock de `react-native-worklets` em `jest.setup.cjs`
precisa expor, além de `runOnJS` e `runOnUI`, também
`createSerializable`, `executeOnUIRuntimeSync`, `RuntimeKind`,
`serializableMappingCache`, `WorkletsModule`, `makeShareable`,
`isWorkletFunction` e `callMicrotasks` como no-ops — no mesmo bloco do
mock de SVG.

**Origem:** detectada na M25 (2026-05-03) ao adicionar
`OuroborosLoader` com `Animated.createAnimatedComponent`, primeiro
código de `src/` a importar Reanimated direto. De M01 a M24 o Reanimated
só entrava via `moti`, que tem mock próprio.

## A23 — `web.output: static` quebra no SSR por framer-motion + tslib

**Área:** build / Web

**Sintoma:** `TypeError: Cannot destructure property '__extends' of
'n.default' as it is undefined` durante o SSR, no SDK 54.

**Causa raiz:** o init do `framer-motion` ESM (transitivo via
`moti@0.30`) importa `tslib` de forma desestruturada, e a resolução
Node do `expo-router 6.0.23` em SSG não exporta `default` de `tslib`
como esperado.

**Consequência:** `app/+html.tsx` (preload das fontes JetBrainsMono
servidas em `public/fonts/`) **só seria processado em static
rendering** — e static rendering quebra. Com `web.output: "single"` o
export passa, mas o `index.html` gerado é o template padrão do CLI do
`expo-router`, e o `+html.tsx` não é lido, perdendo o ganho de preload.
Injetar `<link>` por `_layout.tsx` também não dá ganho real, porque a
fonte só começa a baixar depois que o bundle JS parseia.

**Decisão (M-GAUNTLET-FAST-BOOT-FOLLOWUP, 2026-05-04):** não corrigir;
aguardar SDK 55+ ou release de `moti` que não quebre SSR. Os arquivos
`public/fonts/`, `public/styles/flash-inicial.css` e `app/+html.tsx`
permanecem versionados e servidos pelo Metro em dev, sem regressão.

## A24 — Regex literal com classe `[-:.]` quebra o export Android

**Área:** build / NativeWind

**Sintoma:** `npx expo export --platform android` falha com
`SyntaxError: Unexpected token Semicolon` em `style.css` linha N,
vindo de `cssToReactNativeRuntime` (`react-native-css-interop`).

**Causa raiz:** NativeWind 4 + Metro escaneiam o código-fonte **como
texto** procurando classes Tailwind arbitrárias `class-[...]`. Padrões
regex que se parecem com seletores CSS arbitrários entre colchetes (por
exemplo `/[-:.]/g` no meio de uma string) viram pseudo-classes
inválidas no `style.css` gerado, quebrando o parser de CSS em runtime.

**Reprodução:** adicione `const r = /[-:.]/g;` em qualquer arquivo sob
`src/**` ou `app/**`, rode `npx expo export --platform android` e
observe `style.css:N: SyntaxError`.

**Workaround pragmático:** trocar o literal por `.split('-').join('')
.split(':').join('').split('.').join('')` encadeado, ou usar
`RegExp("[-:.]", "g")` (construtor com string) em vez de `/[-:.]/g`.

**Recomendação durável:** regra de lint banindo
`\/\[[-:.@\\\/].*\]\/[gimsu]*/` nos arquivos cobertos pelo `content` do
`tailwind.config.js`.

**Origem:** descoberta na sprint C5 (M-BACKUP-AUTOMATICO) ao adicionar
um regex em `executarBackup.ts:155` para gerar slug ISO.

**Estado:** referência de linha desatualizada — o arquivo hoje é
`src/lib/backup/executarBackup.ts` e o workaround com `split('-')`
está por volta da linha 250. A armadilha em si continua válida: o
scanner do NativeWind segue lendo o código-fonte como texto.

## A25 — Package exports do Metro vs imports relativos sem extensão

**Área:** Metro

**Sintoma literal:**

```
Unable to resolve "./period" from
"node_modules/react-native-calendars/src/calendar/day/index.js"
```

durante `npx expo export --platform <web|android>` ou `expo start`.

**Causa raiz:** pacotes que resolvem imports internos por caminhos
relativos sem extensão (`./period`, `./basic`, `./marking`) apontando
para diretórios com `index.js` ao lado de `.d.ts` falham no resolver do
Metro no SDK 54 quando `config.resolver.unstable_enablePackageExports
= true` está ativo (default a partir do SDK 54, e necessário por causa
de A14). Com package exports habilitado o resolver deixa de aplicar a
busca de fallback por `<dir>/index.{js,ts,tsx}` em alguns subpaths
internos de pacotes legados, especialmente onde há `.d.ts` no mesmo
nível.

**Workaround canônico (M37.1, 2026-05-05):** `resolveRequest` custom em
`metro.config.js`, filtrado **apenas** ao pacote afetado, sem desligar
a flag globalmente:

```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('./') &&
    typeof context.originModulePath === 'string' &&
    context.originModulePath.includes('react-native-calendars/src/')
  ) {
    const dir = path.dirname(context.originModulePath);
    const candidates = [
      path.resolve(dir, `${moduleName}.tsx`),
      path.resolve(dir, `${moduleName}.ts`),
      path.resolve(dir, `${moduleName}.js`),
      path.resolve(dir, moduleName, 'index.tsx'),
      path.resolve(dir, moduleName, 'index.ts'),
      path.resolve(dir, moduleName, 'index.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return { type: 'sourceFile', filePath: c };
      }
    }
  }
  if (typeof originalResolver === 'function') {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

**Pacotes conhecidos afetados:** `react-native-calendars@1.x` (M37.1,
2026-05-05).

**Diagnóstico rápido:** rodar `npx expo export --platform web` ou
`--platform android` e checar se o erro casa `Unable to resolve "./X"
from .../index.js`. Se sim, estender a lista acima e ampliar o filtro do
`resolveRequest` com o novo prefixo de path.

**Não-fix (proibido):** desabilitar `unstable_enablePackageExports`
globalmente quebra o peer com Reanimated 4 e outras dependências do SDK
54, e regride para A14 (bundle Web volta a falhar com `import.meta`
fora de módulo). A lista de pacotes afetados é viva: sprint que
adicionar dependência RN antiga deve checar contra A25 antes de
declarar build verde.

## A26 — Nome do plugin de worklets + `expo-dev-client` em `plugins[]`

**Área:** build

**Sintoma duplo:** (1) springs silenciosas no Hermes Android,
especialmente em release minificado, quando o nome antigo do plugin é
mantido; (2) builds de preview e production quebram quando
`"expo-dev-client"` aparece em `app.json plugins[]`.

**Causa raiz:** a partir do Reanimated 4 / SDK 54 o entry de Babel
mudou de `react-native-reanimated/plugin` para
`react-native-worklets/plugin` (e continua precisando ser o **último** —
A1). Em dev o transformer disfarçava o nome errado por fallback, mas o
release quebrava. Já o config plugin do `expo-dev-client` tenta linkar
um módulo nativo que só existe no profile `development`.

**Correção canônica (sprint `c82f4aa`):** usar
`react-native-worklets/plugin` e remover `expo-dev-client` de
`plugins[]` — ele continua como dependency e é linkado por autolinking
apenas no profile de desenvolvimento.

## A27 — `react-native-svg` no Fabric exige arrays

**Área:** UI / SVG / New Arch

**Sintoma:** SVGs que funcionavam no renderer antigo (paper) não
renderizam ou renderizam deslocados no Fabric.

**Causa raiz:** as primitivas SVG no Fabric recusam strings que o paper
aceitava.

**Correção:**

- `transform="translate(175,40)"` → props `x={175} y={40}` ou array
  `transform={[{ translateX: 175 }, { translateY: 40 }]}`.
- `strokeDasharray="1 8"` → `strokeDasharray={[1, 8]}`.
- `useAnimatedProps` que devolve `transform` como string quebra em
  Android nativo mas funciona no Web — ramificar por `Platform.OS` se
  necessário (Web usa string, nativo usa props separadas ou array).

**Correção canônica (commits `f6d2cea`, `e51d4f5`, `a0a4e0f`):**
`OuroborosLoader` e `OuroborosLogo` migrados para props numéricas e
arrays.

## A28 — `MotiView` no boot path crasha no New Arch

**Área:** animações / New Arch

**Sintoma:** tela branca em release; frame inicial travado.

**Causa raiz:** `moti@0.30` + Reanimated 4 + Fabric — animações
`from`/`animate` durante a árvore de boot (onboarding, providers do
`_layout`, gates) podem travar o primeiro frame.

**Correção canônica (commit `ada414e`):** componentes do boot path
(`FrameAnim` do onboarding, `OnboardingGuard`) usam Reanimated puro —
`useSharedValue` + `useAnimatedStyle` + `withSpring` em
`Animated.View`. O resto do app (cerca de 38 usos residuais de `moti`)
migra conforme auditoria dedicada. Complemento: `require` tardio e stub
seguro para módulos nativos opcionais
(`expo-speech-recognition`, ML Kit) em qualquer caminho que não seja
dev-client, para que cliente genérico e builds de preview não crashem
por autolinking.

## A29 — Hardcode de `VAULT_PATH` + trailing space do SAF

**Área:** vault

**Sintoma:** saves silenciam e loaders ficam "carregando eternamente"
em várias features.
`IllegalArgumentException: Invalid URI` em `writeAsStringAsync`
(tarefa) e `IOException: directory cannot be created` em `copyAsync`
(GIF de exercício).

**Causa raiz dupla:** (1) `inicializarVaultCanonico()` forçava tentar
`/sdcard/Documents/Ouroboros/` por hardcode de `VAULT_PATH` em
`src/lib/vault/permissions.ts`, caindo no SAF picker em OEMs
MIUI/OneUI/HyperOS; (2) o URI devolvido pelo SAF pode conter trailing
space (`primary:Protocolo-Ouroboros%20`), que vazava para todas as URIs
filhas em `garantirSubpastas` (linha 137 na época: `vaultRoot.endsWith('/')
? vaultRoot : vaultRoot + '/'`, sem trim).

**Correção canônica (sprints H1 e H3):** helper `vaultUriJoin` com trim
agressivo, remoção de `%20` ofensivos e assertion de vazio; remoção do
hardcode de `VAULT_PATH` — a pasta passa a ser escolha do onboarding
(ADR-0022).

**Diagnóstico rápido:** se um save trava em loading sem erro visível,
rodar `adb logcat -d | grep -Ei 'Invalid URI|directory cannot be
created'`.

**Estado:** correção aplicada e referência de linha histórica. Hoje
`garantirSubpastas` está em `src/lib/vault/permissions.ts:330` e monta
cada URI com `vaultUriJoin` (importado de `./paths` na linha 50); não há
mais `VAULT_PATH` hardcoded no arquivo.

## A30 — Bottom-sheet renderiza offscreen no Fabric com index inicial 0

**Área:** UI / New Arch

**Sintoma:** loader visível, mas o sheet nunca aparece; o backdrop
também não faz fade-in. Chamar `expand()` por ref ou usar
`animateOnMount` isoladamente não destrava. Validado ao vivo em Redmi
Note 13 com HyperOS (2026-05-09).

**Causa raiz:** `@gorhom/bottom-sheet` v5 foi escrito contra as APIs do
Reanimated v3; com Reanimated 4 + Fabric, o
`enableDynamicSizing=true` (default da v5) exige que o children direto
seja `BottomSheetView` ou `BottomSheetScrollView` para medir altura. Com
um `<ScrollView>` cru, o sheet renderiza com altura 0 e fica em
`translateY = screenHeight` (snap fechado permanente).

**Correção canônica:**

- No wrapper `BottomSheet`: `animateOnMount={true}` +
  `enableDynamicSizing={false}`.
- Consumidores com scroll interno: trocar `<ScrollView>` por
  `<BottomSheetScrollView>`. Cuidado: só dentro do BottomSheet — em
  telas regulares com sheet auxiliar isso quebra com
  `useBottomSheetInternal cannot be used out of the BottomSheet`.

**Diagnóstico:** se o sheet não abre em mobile mas abre no Web
(Gauntlet), provavelmente é A30. A issue #1751 do repositório do pacote
confirma o comportamento; #2046, #2528, #2546, #2547 e #2600 relatam o
mesmo problema com variações.

**Estado:** aplicado em `src/components/ui/BottomSheet.tsx` (linhas
209-210).

## A31 — `expo-file-system` bloqueia writes na raiz de `/sdcard/`

**Área:** vault / Android

**Sintoma:** `inicializarVaultEscolhido(file:///sdcard/Ouroboros/)`
falha silenciosamente no probe de escrita; `garantirSubpastas` engole
erros de `makeDirectoryAsync`; o vault nunca inicializa. Logcat:
`Location 'file:///sdcard/X' isn't writable`. Validado ao vivo em Redmi
Note 13 com HyperOS (2026-05-09).

**Causa raiz:** o `FilePermissionModule` do `expo-modules-core` usa
`appContext.filePermission?.getPathPermissions()`, que só reconhece
como graváveis os caminhos em `context.filesDir`, `context.cacheDir` e
`context.getExternalFilesDir(null)`. Mesmo com
`MANAGE_EXTERNAL_STORAGE` no manifest e o UID autorizado via `appops`,
a bridge JS rejeita.

**Correção canônica:** `sugestaoVaultUriDefault()` passa a computar o
caminho por `FileSystem.documentDirectory + 'Ouroboros/'`
(`/data/user/0/<pkg>/files/Ouroboros/` — diretório interno do app,
sempre gravável). Trade-off aceito: o vault deixa de ser visível
diretamente para ferramentas externas de sync ou edição. Usuário
avançado escolhe pasta externa pelo SAF picker ("Outra pasta"), e
`safTreeUriToFileUri()` converte o tree URI para o `file://`
equivalente no armazenamento principal.

**Diagnóstico:** se o probe falha em `/sdcard/X`, **não** é problema de
permissão do Android — é restrição da bridge do `expo-file-system`.

**Estado:** `sugestaoVaultUriDefault()` em
`src/lib/vault/permissions.ts:96`.

## A32 — HyperOS / MIUI bloqueia `adb install -r`

**Área:** device / ADB

**Sintoma:** `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`
mesmo com "Install via USB" e "Depuração USB (configurações de
segurança)" ativadas nas opções de desenvolvedor. O popup de
confirmação do HyperOS nunca aparece para alguns APKs (filtragem por
assinatura sem garantia do fabricante).

**Correção canônica:** bypass por `adb push` para `/data/local/tmp/` +
`pm install` pelo shell:

```bash
adb push builds/<apk> /data/local/tmp/app.apk
adb shell pm install -r -t /data/local/tmp/app.apk
```

Funciona porque `pm install` roda como usuário `shell` (privilegiado) e
não passa pelo verificador do HyperOS.

**Diagnóstico rápido:** se `adb install` falha com `USER_RESTRICTED` e o
popup nunca apareceu, não insista na flag — vá direto para o `pm
install` pelo shell.

## A33 — `w-10` no Header corta o slot direito

**Área:** UI

**Sintoma:** conteúdo do slot direito do `Header.tsx` cortado quando é
maior que 40dp (pill com ícone e label). Sintomas encadeados
observados: variant `ghost` invisível por contraste ruim → variant
`pill` com `Button` genérico colapsando a flex row (só o ícone
renderiza, ver A34) → `Pressable` inline quebrando o texto em
"Re/ca/p" porque `w-10` corta.

**Causa raiz:** largura fixa `w-10` (40dp) no container do slot
direito.

**Correção canônica:** trocar `w-10` por `style={{ minWidth: 40,
alignItems: 'flex-end' }}` no slot direito — cresce com o conteúdo e
mantém simetria com o slot esquerdo (botão de voltar, 40dp).

**Estado:** aplicado em `src/components/ui/Header.tsx` (comentário na
linha 59, `minWidth: 40` na linha 64). O slot **esquerdo** segue com
`w-10` na linha 31, o que é correto: ele hospeda só o ícone de voltar.

## A34 — `Button` genérico com `MotiView` colapsa flex row

**Área:** UI

**Sintoma:** um CTA com ícone + label renderiza só o ícone; o `Text`
irmão é ignorado. Ocorre em release Android e no Web (New Arch).

**Causa raiz:** o `MotiView` aplica `alignItems: center` +
`justifyContent: center` no container, e isso colapsa filhos
`<View flexDirection: 'row'>` no New Arch.

**Correção canônica:** para pills e CTAs com layout custom (ícone +
label, badge), usar `Pressable` direto inline (cerca de 30 linhas, sem
`MotiView`). O `Button.tsx` fica reservado a CTAs primários
full-width com label string.

**Estado:** o `Button.tsx` continua com `MotiView` dentro do
`Pressable` (linhas 92-149) — é o uso legítimo descrito acima. A
divisão de responsabilidade é a correção; não há nada a "consertar" no
`Button` em si.

## A35 — Coordenadas do `adb tap` vs screencap escalado

**Área:** device / ADB

**Sintoma:** taps caem no lugar errado quando as coordenadas são lidas
de um screencap.

**Causa raiz:** `adb shell input tap` usa coordenadas da tela física
(por exemplo 1080×2400), mas o PNG puxado do screencap costuma chegar
escalado (por exemplo 540×1106, redução de 2x).

**Conversão:** `tap_x = screencap_x × physical_w / screencap_w`.

**Solução melhor que tap cego:** ler os bounds reais da árvore de
acessibilidade, que já vêm em coordenadas físicas absolutas:

```bash
adb shell uiautomator dump /sdcard/ui.xml
adb pull /sdcard/ui.xml /tmp/ui.xml
grep -oE 'text="[^"]*" .* bounds="[^"]*"' /tmp/ui.xml | head -20
```

## A36 — ANR sem toast indica crash JS antes do error boundary

**Área:** device / diagnóstico

**Sintoma:** ANR (Application Not Responding) em
`DevLauncherErrorActivity`, sem toast de erro. O logcat mostra apenas a
transição do WindowManager e `Killing X (adj 0): user request after
error`.

**Causa raiz:** o JS crashou antes de o error boundary do React montar,
então não há UI de erro para exibir.

**Diagnóstico:**

```bash
adb logcat -d -s ReactNativeJS:* 2>&1 | tail -50
# ou capturar o PID antes do crash:
PID=$(adb shell pidof com.ouroboros.mobile)
adb logcat -d --pid=$PID 2>&1 | grep -iE 'TypeError|Invariant|Cannot'
```

## A37 — Build de dev-client na fila do serviço demora 10-25 min

**Área:** build / CI

**Contexto:** o build de dev-client compila código nativo e assina com
keystore do serviço; no plano gratuito a fila somada leva 10 a 25
minutos.

**Regra de economia:** antes de disparar um build, conferir se um APK
local em `builds/dev-client-*.apk` já cobre as edições. Para
dev-client, **só código nativo importa** — mudança apenas de JS é
entregue ao vivo pelo Metro. Reusar o APK existente com `adb reverse
tcp:8081 tcp:8081` é muito mais rápido.

**Critério para rebuild:** rodou `expo install` novo, versão de pacote
nativo mudou, ou config plugin foi adicionado.

## A38 — Quota mensal Android do plano gratuito esgota

**Área:** build / CI

**Sintoma:** todo `eas build --platform android` falha com `Error: build
command failed.` no passo de upload. A mensagem do serviço é explícita
("this account has used its Android builds from the Free plan this
month, which will reset in N days"). Descoberto em 2026-05-13 ao tentar
disparar um alpha logo após o anterior.

**Mitigação canônica:** o workflow
`.github/workflows/build-android-apk.yml` faz build local com `expo
prebuild` + `gradle assembleRelease` no runner Ubuntu, sem consumir
quota.

**Limitação da mitigação:** o APK do workflow é assinado com keystore
debug (SHA-1 do AOSP), que não bate com o SHA-1 registrado no client
OAuth Android do console — o login do provedor retorna `Error 400
invalid_request` nesse APK.

**Correção futura (Q17.e):** guardar o keystore de release em secret do
repositório como base64 e decodificar no workflow.

## A39 — `env.json` gitignored quebra o build no CI

**Área:** CI

**Sintoma:** `Unable to resolve module ../../../env.json` no bundle JS
durante o build no runner.

**Causa raiz:** o arquivo carrega o `client_id` do OAuth (não sensível,
mas com `project_id` privado) e está no `.gitignore`. No `git clone` do
runner ele não existe, e `googleAuthFlow.ts` faz `import envJson from
'../../../env.json'`.

**Mitigação canônica:** versionar `env.json.example` com `client_id`
stub seguro e criar um passo "Provision env.json" no workflow que tenta
o secret `ENV_JSON_BASE64` primeiro e cai em copiar o `.example` quando
ausente. Descoberto em 2026-05-13 no primeiro run do workflow de CI
local (commit `67c3022` resolve).

**Nota relacionada:** a mesma ausência quebra a suíte Jest localmente —
ver A41. O mapeamento global de módulo no Jest é o que impede a suíte de
depender do arquivo real.

## A40 — OSC 9 vaza em terminal sem suporte e quebra o raw-mode do TTY

**Área:** ambiente de desenvolvimento

**Sintoma:** caracteres como `]9;` ou `^[]777;` aparecem vazando no
terminal entre comandos; teclas digitadas passam a ser interpretadas
como continuação da sequência de escape e a sessão da ferramenta de
linha de comando "fecha" sozinha. Descoberto em 2026-05-21.

**Causa raiz:** ferramentas de CLI modernas emitem OSC 9 (notificação
push) e OSC 9;4 (barra de progresso) ao iniciar e terminar tarefas
longas, quando configuradas para um canal de notificação estilo
iTerm2/Ghostty. GNOME Terminal (VTE), xterm e o tty padrão **não
interpretam** esses códigos: consomem parcialmente a sequência e deixam
o byte `ESC` pendente, corrompendo o raw-mode. É um mismatch entre o
dialeto OSC configurado e as capabilities do terminal real.

**Correção imediata:** nas configurações globais da ferramenta, trocar
o canal de notificação para `"system"` (`preferredNotifChannel:
"system"`) e desligar a flag de notificação push por tarefa.

**Correção estrutural:** usar um terminal que suporte OSC 9 — Ghostty,
Kitty, iTerm2, WezTerm. Um hook de início de sessão no ambiente de
shell pode emitir um bloco `[AVISO TERMINAL]` quando detectar o
mismatch, servindo de guarda contra regressão.

**Importante:** o bug **não tem origem no projeto**. Varredura de
`scripts/`, `gauntlet.sh`, `run.sh` e `smoke.sh` por ANSI raw ficou
zerada em 2026-05-21 — é combinação de ferramenta externa, setting
global e terminal.

## A41 — Bootstrap incompleto de cópia de trabalho (`env.json`, `.env`, `node_modules`)

**Área:** ambiente / Jest

**Sintoma:** Jest falha em até 6 suítes (`googleAuth`, `calendarApi`,
`spotify`, `youtube`, `googleAuthFlow`, `agenda`) com "Cannot find
module 'env.json'" ou erros de resolução de yaml; `tsc --noEmit`
também acusa `env.json` ausente.

**Causa raiz:** cópia de trabalho criada por automação externa não
dispara o hook `post-checkout`, deixando ausentes os três links
obrigatórios (`node_modules`, `env.json`, `.env`).

**Diagnóstico:** rodar `ls -la node_modules env.json .env` na raiz da
cópia de trabalho; se algum é arquivo real ou está ausente, refazer o
bootstrap manualmente.

**Correção histórica (2026-05-22):** o script de bootstrap passou a
retornar exit diferente de zero dentro de cópia de trabalho quando um
link obrigatório (`node_modules` ou `env.json`) não pudesse ser criado
— `.env` permanecia opcional por ser gitignored. O `scripts/smoke.sh`
capturava a saída do bootstrap em log e propagava o erro em vez de
silenciar com `2>&1`. Fora de cópia de trabalho, o script seguia com
exit 0 silencioso, para preservar o hook `post-checkout` no repositório
principal.

**Histórico de incidência:** R-CRIT-4, T1B3, T1B6 e a sprint PASSOS —
mais de 10 ocorrências antes da correção.

**Estado: possivelmente obsoleta** — o script `scripts/bootstrap-worktree.sh`
e o hook `hooks/post-checkout` não existem mais no repositório
(`hooks/` contém apenas `pre-commit` e `pre-push`) e `scripts/smoke.sh`
não invoca bootstrap algum. O **sintoma** continua válido para qualquer
cópia de trabalho sem `env.json` / `node_modules`: se as suítes de
integração quebrarem por módulo ausente, comece checando esses
arquivos.

## A42 — Metro do Gauntlet morre pós-bundle sem bindar a porta

**Área:** DX / Metro

**Sintoma:** `./gauntlet.sh` bundla (`Web Bundled ...`) e depois `curl
localhost:8081` retorna 000, nenhum processo `expo start` vivo, sem
erro claro no log. Frequente depois de apagar cópias de trabalho: o
file-map do Metro do repositório principal referencia diretório
deletado → `ENOENT: watch '.../worktrees/<nome-morto>/...'` → crash.

**Causa raiz dupla:** (1) caches de file-map (`/tmp/metro-file-map-*`)
e de transform (`/tmp/metro-cache`, `node_modules/.cache/metro`)
guardam caminhos de diretórios que já não existem; (2) envolver o
script em `nohup ... &` externo mata o processo Metro filho.

**Correção permanente (R-DX-GAUNTLET-ROBUSTEZ, 2026-05-26):** o
`gauntlet.sh` faz pré-flight de higiene (`git worktree prune` +
limpeza idempotente dos caches) e health-check pós-launch com detecção
de morte do PID — imprime `OK:` ou `ERRO:` com o tail do log e sai com
código não-zero, nunca em silêncio.

**Regra:** nunca envolver o `gauntlet.sh` em `nohup ... &` externo.

## A43 — `jest.doMock` virtual colide com módulo em symlink

**Área:** Jest

**Sintoma:** a suíte passa isolada (12/12) e no run completo do
repositório principal, mas falha no run completo **dentro de uma cópia
de trabalho** — por exemplo `spotify/oauth.test.ts`, 4 testes.

**Causa raiz:** quando `env.json` é um symlink (bootstrap de cópia de
trabalho usa `ln -sfn`), o resolver do Jest segue o link até o realpath
e popula o module cache sob essa chave se outra suíte carregar antes.
Essa chave diverge da chave do `doMock` virtual, que usa o caminho do
symlink — o mock não intercepta e o código lê o arquivo real.

**Correção:** usar `jest.mock('<path>', factory)` **hoisted no topo, sem
`virtual: true`** — registra o mock para o specifier antes de qualquer
`require` resolver fisicamente, e é determinístico em qualquer cenário.

**Padrão canônico:**
`tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts` (sprint
R-INFRA-JEST-ENV-MOCK-FLAKE, `f1759e9`).

## A44 — Seis incompatibilidades de infra no Expo SDK 56

**Área:** build / Jest

**Contexto:** descobertas no upgrade 54 → 56
(R-INFRA-EXPO-SDK-56-UPGRADE, `021c00c`, 2026-05-26), cada uma com
causa raiz isolada. Vale como playbook para o próximo upgrade de SDK
major:

1. **Preset do Jest** — o RN 0.85 extraiu o preset: instalar
   `@react-native/jest-preset` (peer do `jest-expo` 56) e apontar
   `tests/__env__/rn-realtimers.js` para
   `@react-native/jest-preset/jest/react-native-env.js` (saiu de
   `react-native/jest/`).
2. **11546 erros de `tsc`** — o auto-include de `@types/*` deixou de
   funcionar com `moduleResolution: bundler` + TS6. Corrigir com
   `"types": ["jest","node"]` e `"ignoreDeprecations": "6.0"` (por
   causa do `baseUrl`) no `tsconfig.json`. Sem o `types`, `describe`,
   `it`, `expect` e `jest` desaparecem dos globais.
3. **Mock de worklets** — o Reanimated 4.3 chama `scheduleOnUI` no
   init: adicionar `scheduleOnUI` e `runOnUISync` ao mock de
   `react-native-worklets` em `jest.setup.cjs`.
4. **css-interop (NativeWind)** — acessa `Appearance`, `AppState`,
   `AccessibilityInfo`, `Dimensions`, `I18nManager` e `PixelRatio` no
   init, disparado pelo getter `global.fetch` do runtime do Expo 56.
   Suítes que mockam `react-native` apenas com `Platform` quebram no
   load. Um helper de mock precisa stubar os seis;
   `requireActual('react-native')` **não** funciona (quebra com
   `Component` undefined).
5. **Jest 56 + `isolateModules`** — `jest.doMock` interno **não**
   sobrescreve o `jest.mock` hoisted do topo do arquivo: cenários com
   `Platform.OS` diferente exigem arquivo de teste próprio, mockando no
   topo. E bibliotecas nativas opt-in já instaladas (por exemplo
   `expo-task-manager`) passam a carregar no Jest no SDK 56 — mockar a
   ausência deterministicamente.
6. **Prebuild** — `@expo/config-plugins` deixou de ser hoisted no
   top-level; config plugins de bibliotecas de terceiros (por exemplo
   `@react-native-community/datetimepicker`) quebram `expo config`.
   Instalar `@expo/config-plugins` como devDependency para forçar o
   hoist.

**Validação de build nativo no SDK 56:** `expo config` com exit 0
(proxy do prebuild) + `assembleDebug` no CI (gradle compila
Kotlin/nativo). O `expo-share-intent` roda no SDK 56 apesar do peer
`^55` — peer impreciso, não bloqueia.

**Estado: possivelmente obsoleta nos detalhes** — o upgrade foi
revertido (o repositório está em `expo ~54.0.33`) e os artefatos
citados no item 4 não existem mais (`tests/__support__/` foi removido;
só `tests/__env__/rn-realtimers.js` permanece). O valor da entrada é o
playbook, não os caminhos.

## A45 — CI verde não prova que o app sobe no device

**Área:** CI / release

**Sintoma:** o upgrade para o SDK 56 passou no smoke e compilou no CI
(`assembleDebug` verde), mas crashou no **boot** do aparelho:
`NoClassDefFoundError: Lexpo/modules/kotlin/types/LazyKType;` em
`expo.modules.av.video.VideoViewModule`.

**Causa raiz:** o `expo-av` foi **removido do SDK 56** (substituído por
`expo-audio` + `expo-video`); a versão SDK 54 do `expo-av` referencia
uma classe que o `expo-modules-core` 56 removeu. O `AppContext`
registra **todos** os módulos nativos no boot, então um módulo
incompatível derruba o app independentemente de o JS usá-lo. O gradle
gera o `.aar` sem reclamar, porque a classe ausente só é resolvida em
runtime pelo `DexPathList`.

**Lição durável:** ao subir SDK major, conferir o
`bundledNativeModules.json` procurando pacotes Expo **removidos**
(comparando com as deps de `package.json`), e tratar **validação de
boot no aparelho (dev-client) como obrigatória** — CI compilar é
condição necessária, não suficiente.

**Desfecho:** revertido para o SDK 54 (`462375a`, 2026-05-27). A
migração `expo-av` → `expo-audio` / `expo-video` é pré-requisito de um
SDK 56 futuro.

## A46 — `captureRef` lança `NullPointerException` em árvore com Reanimated no Fabric

**Área:** mídia / New Arch

**Sintoma:** tocar em compartilhar não gera imagem; o PNG sai com **0
bytes**, a folha de compartilhamento nunca abre e o overlay fecha em
silêncio. Descoberto em validação ao vivo no Redmi (HyperOS / Android
15, dev-client SDK 54) na R-RECAP-8 (2026-07-10), na opção "Post
quadrado" de `/recap-memorias`. Logcat:

```
E ViewShot: Failed to capture view snapshot
java.lang.NullPointerException: Attempt to read from field
  'int android.view.View.mViewFlags' on a null object reference
  in method 'void android.view.ViewGroup.dispatchDraw(Canvas)'
  at com.facebook.react.views.view.ReactViewGroup.dispatchDraw(ReactViewGroup.kt:872)
  at fr.greweb.reactnativeviewshot.ViewShot.captureViewImpl(ViewShot.java:382)
```

**Causa raiz:** o ref de captura apontava para o container raiz da
tela, que inclui o `Background` animado com Ken Burns (Reanimated). Na
árvore animada, child Views entram e saem durante o `dispatchDraw`, e o
`captureRef` lê `mViewFlags` de um child `null`.

**Invisível para a suíte:** o Jest moca `react-native-view-shot` e o
Gauntlet Web faz early-return com `motivo: 'web'`. Só reproduz em
runtime nativo — classe de bug de OEM / New Arch.

**Correção canônica (R-RECAP-8):** capturar uma **view isolada e
estática** (`src/components/recap/ShareCardMemoria.tsx` — sem
Reanimated, sem Ken Burns, sem auto-advance), montada fora da tela, e
apontar o ref de captura para ela. Elimina o child nulo da árvore
animada e ainda dá enquadramento 1:1 / 9:16 determinístico,
independente do tamanho do aparelho. O `collapsable={false}` na View
raiz é necessário para que ela tenha nó nativo próprio.

**Diagnóstico rápido:** se `captureRef` falha no aparelho mas a UI
existe (e o compartilhamento funciona no Web ou em telas sem
Reanimated), suspeitar de child nulo na árvore animada — isolar a
captura numa view chapada.

**Não-fix:** apenas pausar ou congelar o Reanimated antes de capturar é
frágil por timing e não elimina a causa, porque o child ainda pode
reciclar.

## A47 — `zustand persist` com merge shallow não back-filla chave nested nova

**Área:** stores / persistência

**Sintoma:** numa instalação que já existia antes da sprint que
adicionou a chave, o Recap abria com a música **muda** por padrão,
apesar do default ser ligada. Descoberto em validação ao vivo na
R-RECAP-9b (2026-07-11).

**Causa raiz:** o config de `persist` em `src/lib/stores/settings.ts`
tinha `version: 2` e `migrate`, mas o `migrate` **só roda quando a
versão persistida é menor que a atual**. Instalações já em v2 (todos os
usuários atuais) não disparam `migrate`, e a hidratação cai no `merge`
**shallow** padrão do zustand (`{...currentState, ...persistedState}`).
Nele, o objeto `featureToggles` persistido — **sem** a chave nova —
**substitui o default inteiro**, a chave hidrata `undefined`, e
`undefined` é falsy.

**Isto é sistêmico:** qualquer feature toggle novo adicionado depois de
o usuário instalar hidrata `undefined`. A chave da música foi só a
primeira em que "undefined → falsy" era visível e errado.

**Invisível para a suíte e para o Gauntlet:** os testes chamam
`resetar()` (defaults limpos) e o seed do Gauntlet injeta o
`DEFAULT_STATE_V2` completo, já com a chave nova. O bug só aparece com
**estado persistido orgânico** de uma versão anterior.

**Correção canônica:** adicionar um `merge` custom ao config de
`persist`, que roda em **toda** hidratação e faz **deep-merge** com os
defaults (reusando o helper `mesclarDefaults`, que já existia mas antes
só era chamado dentro do `migrate`), com guard para `persistedState`
nulo ou não-objeto e spread de `currentState` **primeiro**, para
preservar as ações do store.

**Segunda porta — restore de backup:** a mesma classe de bug reentra por
`aplicarSnapshot` (`src/lib/services/restaurarVault.ts`), que fazia
`setState` wholesale nos sub-objetos direto do snapshot. Restaurar um
backup exportado antes da sprint que adicionou a chave reintroduz o
`undefined`. Correção idêntica: deep-merge de cada sub-objeto com
`DEFAULT_STATE_V2` (exportado do store) antes de aplicar.

**Regra durável:** ao adicionar chave nested nova a um store
persistido, não confie só no `migrate` (que é version-gated). Garanta
(1) um `merge` custom com deep-merge dos defaults na hidratação **e**
(2) o mesmo back-fill em **todo `setState` wholesale** que venha de
estado externo (restore de snapshot, import). Sem isso, instalações já
versionadas ou backups antigos ficam com a chave `undefined`.

**Guard sistêmico (AUDIT-P1-8, 2026-07-28):** as **sete** stores
persistidas do repositório foram revisadas uma a uma. **Seis** têm
objeto aninhado persistido e ganharam `merge` custom exportado:
`sessao` (`rascunhos` / `permissoesPedidas` / `flags`), `onboarding`
(`sexoDeclarado` / `permissoes`), `pessoa` (`nomes` / `fotos`),
`googleAuth` (`contas`, em **dois níveis**: back-fill de `contas` e de
cada `contas.pessoa_X` contra `CONTA_VAZIA`), `spotify` e `youtube`
(`conta`) — somando-se a `settings`, que já tinha o dela desde a
R-RECAP-9b. O `src/lib/stores/vault.ts` é a exceção **deliberada**:
persiste só `vaultRoot: string | null`, estado plano, sem sub-objeto —
não tem a forma da armadilha, e um `merge` ali seria ruído.

A segunda porta (`aplicarSnapshot` em `restaurarVault.ts`) foi
estendida aos sub-objetos de `onboarding` e `pessoa`. O guard `if
(snap.onboarding.permissoes)` que já existia cobria o sub-objeto
**ausente por inteiro**, não o sub-objeto **presente com chave
faltando**, que é a forma exata desta armadilha. As outras quatro
stores não entram no snapshot de export, então para elas a segunda
porta não existe.

**Consequência para sprint nova:** adicionar chave nested a qualquer uma
dessas sete não exige mais tocar no `merge` — basta conferir que o
default novo entrou na constante de defaults do módulo, que é a fonte
que o `merge` consulta.

**Verificação:** a contagem de `persist(` deve exceder a de `merge:`
em exatamente um (a exceção deliberada do vault):

```bash
rg -n "persist\(" src/ app/          # 8
rg -n "merge:" src/lib/stores/ src/lib/integracoes/   # 7
```

**Estado:** verificado em 2026-07-29 — 8 `persist(` e 7 `merge:`, com
`src/lib/stores/vault.ts` como única store persistida sem `merge`.
Confere com o documentado.
