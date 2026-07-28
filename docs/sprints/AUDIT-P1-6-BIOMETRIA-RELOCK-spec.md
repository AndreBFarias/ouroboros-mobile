# AUDIT-P1-6-BIOMETRIA-RELOCK — re-trancar o gate de biometria ao voltar do background

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (a única proteção de acesso do app é contornável entregando o
            celular destravado; é exatamente o cenário que justifica existir o
            toggle, num app de diário íntimo de casal)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-6] da auditoria de 2026-07-28. Encontrado ao verificar de
            onde `autenticado` pode voltar a `false`: é `useState` local e o único
            `useEffect` que o zera depende de `[ativa, bypassReal, tentar]`.
            Confirmado por varredura exaustiva dos `AppState.addEventListener` do
            app inteiro — são três, e nenhum toca o gate.
```

## Problema (a tranca só fecha em cold start)

`src/lib/boot/biometriaGate.tsx:62` guarda o estado de autenticação em `useState`
local do componente:

```tsx
const [autenticado, setAutenticado] = useState(false);
```

O único caminho que o zera é o `useEffect` de `:107-114`:

```tsx
useEffect(() => {
  if (!ativa || bypassReal) {
    setAutenticado(true);
    return;
  }
  setAutenticado(false);
  void tentar();
}, [ativa, bypassReal, tentar]);
```

As três dependências são estáveis durante uma sessão: `ativa` é o toggle de
Settings, `bypassReal` é constante em release, e `tentar` é um `useCallback` com
deps `[ativa, bypassReal]` (`:105`). Ou seja, depois do primeiro sucesso o efeito
**nunca mais roda**, `autenticado` fica `true` para sempre, e o guard de `:116-118`
libera a árvore inteira:

```tsx
if (!ativa || bypassReal || autenticado) {
  return <>{children}</>;
}
```

Só um **cold start** (desmontar e remontar o `RootLayout`) recria o estado e
re-tranca.

### Ninguém avisa o gate de que o app foi para o background

Varredura exaustiva por `AppState.addEventListener` em `src/` e `app/` devolve
**exatamente três** ocorrências:

| Local | Para que serve | Toca o gate |
|---|---|---|
| `src/lib/vault/permissions.ts:176` | espera o retorno da tela de configuração do sistema para re-sondar permissão | não |
| `app/_layout.tsx:310` | dispara autopull do Health Connect a cada foreground | não |
| `app/_layout.tsx:392` | dispara auto-sync do Google Calendar a cada foreground | não |

`biometriaGate.tsx` não importa `AppState` (o import de `react-native` em `:28` é
`{ Platform, Pressable, Text, View }`).

### Cenário de ameaça concreto

`pessoa_a` liga "Biometria pra abrir" (`app/settings/index.tsx:593-598`). Abre o
app, autentica com a digital, lê o diário. Sai para responder uma mensagem, e
entrega o celular **destravado** para `pessoa_b` ver uma foto. `pessoa_b` abre os
apps recentes, toca em Ouroboros: o processo continua vivo, `autenticado` continua
`true`, e o diário emocional, as reflexões e as crises abrem **sem prompt algum**.

Não é um caso de borda: é o cenário mais comum de uso do aparelho num
relacionamento, e é literalmente o único ataque contra o qual "biometria pra
abrir" poderia proteger — nenhuma das outras defesas do app (Vault local,
`ocultarTranscricoes`) cobre um dispositivo já destravado nas mãos de outra
pessoa.

### Segundo defeito, na mesma tela: falha-aberto silencioso

`src/lib/boot/biometriaGate.tsx:80-87`:

```tsx
const supported = await LocalAuthentication.hasHardwareAsync();
const enrolled = await LocalAuthentication.isEnrolledAsync();
if (!supported || !enrolled) {
  // Sem hardware ou sem cadastro: libera com aviso silencioso.
  // Spec: não prender o usuario por falta de hardware.
  setAutenticado(true);
  return;
}
```

A decisão é consciente e está documentada no comentário — e é **defensável**:
falhar fechado trancaria a pessoa para fora do próprio diário sem caminho de
recuperação. O defeito não é a decisão, é a **comunicação**: em Settings o toggle
"Biometria pra abrir" segue ligado, sem qualquer indicação de que naquele aparelho
ele não protege nada. O usuário acredita ter uma proteção que não existe. O
comportamento inclusive está travado por teste
(`tests/lib/boot/biometriaGate.test.tsx:62-76`, *"sem hardware libera children
silenciosamente"*), então qualquer mudança aqui precisa ser deliberada.

### Cuidado obrigatório: o bypass de dev não pode quebrar

`bypassReal` (`:59-60`) é `bypass && __DEV__`, e o único consumidor é
`app/_layout.tsx:449` (`<BiometriaGate bypass={MODO_DEV_WEB}>`), com
`MODO_DEV_WEB = Platform.OS === 'web' && __DEV__` (`src/lib/dev/gauntletAtivo.ts`).
É o que mantém o Gauntlet — validação visual obrigatória do projeto — fora do
prompt de biometria. Há ainda o early-return de web em `:71-76`. Qualquer lógica
nova precisa sair cedo nos três casos (`!ativa`, `bypassReal`,
`Platform.OS === 'web'`), e isso tem de virar teste, não intenção.

## Escopo (mínimo)

1. **Re-trancar ao voltar do background, com timeout.** Dentro do próprio
   `BiometriaGate`, registrar um `AppState.addEventListener` que:
   - ao sair de `active`, grava o instante em um `useRef` (não `useState`: não
     deve provocar render);
   - ao voltar para `active`, se `Date.now() - saidaEmMs >= timeoutMs`, faz
     `setAutenticado(false)` e `void tentar()`;
   - faz `sub.remove()` no cleanup — obrigatório pela armadilha A26 (sem leak); o
     padrão exato já está em `app/_layout.tsx:314-316`;
   - **sai cedo** quando `!ativa || bypassReal || Platform.OS === 'web'`, sem nem
     registrar o listener.

2. **Timeout configurável.** Chave nova
   `privacidade.biometriaTimeoutSegundos: number`.

   **Default proposto: 60 segundos — valor é decisão do dono.** Racional a
   confirmar (alternativas: 0 / 30 / 120 / 300):
   - **Por que não 0 (re-trancar sempre).** O app se manda para o background em
     fluxos legítimos e frequentes: o seletor de pasta do Vault (SAF), o
     `expo-image-picker`, o document picker do backup, a câmera, o share intent.
     `src/lib/vault/permissions.ts:167-176` existe **exatamente** para esperar o
     `AppState` voltar de uma tela do sistema. Com 0 s, cada uma dessas idas e
     voltas dispara um prompt de digital — e o usuário desliga a feature.
   - **Por que não vários minutos.** A ameaça descrita é "entreguei o celular
     agora"; uma janela longa deixa o buraco aberto justamente no intervalo em
     que ele é explorado.
   - 60 s cobre o round-trip típico de um picker e fecha a janela de entrega do
     aparelho.

   **Riscos técnicos já verificados que a implementação precisa tratar** (a chave é
   a primeira **não-booleana** do slice `privacidade`):
   - o tipo do slice só tem booleanos hoje (`src/lib/stores/settings.ts:119-122`);
   - `setPrivacidade` está hard-tipado como `valor: boolean`
     (`src/lib/stores/settings.ts:184-186`) — precisa virar
     `SettingsState['privacidade'][K]`, no mesmo formato de `setMidia` (`:188-191`);
   - a migração v1→v2 filtra o slice por
     `filtrarBooleansConhecidos` (`:657-667`, usado em `:516-521`), que **descarta
     silenciosamente qualquer valor não-booleano** — um número seria perdido em
     toda instalação que migra;
   - `mesclarDefaults` (`:556-559`) faz spread simples, então instalação sem a
     chave herda o default — ok;
   - o espelho canônico (`:675-690`) valida contra
     `EstadoSettingsSchema.privacidade` (`src/lib/schemas/vault_estado.ts:84-87`);
     a chave nova entra como `.optional()`, seguindo o precedente explícito de
     `recapAudioAnexadoAutoplay` (`:77`) e `reduzirMovimento` (`:82`);
   - vários testes fixam a forma literal do slice e vão precisar de ajuste:
     `tests/lib/vault/escreverEstado.test.ts:130,172,215,308`,
     `tests/lib/stores/settings-merge-backfill.test.ts:58`,
     `tests/lib/stores/settings.test.ts:221,253`,
     `tests/lib/services/restaurarVault.test.ts:171`.

3. **Controle na UI.** Em `SecaoPrivacidade` (`app/settings/index.tsx:480-628`,
   bloco de render em `:591-627`), abaixo do toggle "Biometria pra abrir"
   (`:593-598`), expor a escolha do timeout
   **apenas quando `privacidade.biometriaAbrir` for `true`** — mesmo padrão
   condicional já usado para o sub-toggle do widget em `:355-363`. Rótulos em
   Sentence case com acentuação PT-BR completa; `accessibilityLabel` sem acento.

4. **Comunicar o falha-aberto** (item separado, e **não** uma mudança de
   comportamento). Manter `setAutenticado(true)` sem hardware/cadastro — a decisão
   documentada em `:82-87` continua válida, e mudá-la trancaria a pessoa para fora
   do próprio diário. O que muda é a honestidade da UI: detectar
   `hasHardwareAsync()` / `isEnrolledAsync()` e, quando qualquer um for falso,
   mostrar subtítulo no toggle de Settings dizendo em PT-BR que aquele aparelho não
   tem biometria cadastrada e que o app abrirá sem bloqueio. `LinkSubTela` e
   `ToggleRow` já aceitam `subtitulo`
   (`src/components/settings/LinkSubTela.tsx:16-22`;
   `app/settings/index.tsx:745-752`).
   **NÃO-objetivo justificado**: converter o falha-aberto em falha-fechado, e
   adicionar PIN/senha como fallback — é feature nova, com seu próprio desenho de
   recuperação, não correção de bug.

5. **Testes Jest** estendendo `tests/lib/boot/biometriaGate.test.tsx` (hoje 5
   casos):
   - background → foreground **dentro** do timeout: não re-autentica;
   - background → foreground **além** do timeout: volta a mostrar a tela
     `accessibilityLabel="bloqueio biometria"` e chama `authenticateAsync` de novo;
   - `bypass={true}` em `__DEV__`: **nunca** re-tranca, por mais tempo que passe
     (blindagem do Gauntlet);
   - `Platform.OS === 'web'`: nunca re-tranca;
   - toggle desligado: o listener nem é registrado;
   - desmontar o gate remove o listener (`sub.remove()` chamado).

6. **Caso E2E** em `tests/e2e/playwright/audit-p1-6-biometria-relock.e2e.ts`
   (modelo: `tests/e2e/playwright/e2e-template.ts`). Escopo do que **dá** para
   assertar na web: a superfície de Settings — que o controle de timeout aparece
   só com o toggle ligado, que alterá-lo persiste em `useSettings`, e que o app
   segue navegável (prova de que o gate continua bypassado no Gauntlet e nenhuma
   rota trancou). **Limite honesto a declarar no caso**: o relock em si é
   inobservável na web, porque o gate é bypassado por
   `bypass={MODO_DEV_WEB}` (`app/_layout.tsx:449`) e `LocalAuthentication` não tem
   implementação web útil (`biometriaGate.tsx:71-76`). A prova do relock é Jest +
   Nível C.

7. **Validação Nível C** (celular físico, **exige permissão explícita do dono** pelo
   arquivo de regras da raiz): ligar o toggle, autenticar, ir para os recentes,
   esperar além do
   timeout, voltar — o prompt tem de reaparecer; e repetir voltando **dentro** do
   timeout — não pode reaparecer. É só JS, então dev-client + Metro já mostra ao
   vivo, sem rebuild.

8. **Atualizar `docs/FEATURES-CANONICAS.md:1167-1168`**, que hoje resume a
   privacidade como *"biometria ao abrir / ocultar transcrições /
   `widgetMostraNome`"*. Documentar: quando o app re-tranca, o timeout e seu
   default, e o comportamento sem hardware/cadastro.

9. **NÃO-objetivo**: mexer nos três `AppState.addEventListener` existentes
   (`src/lib/vault/permissions.ts:176`, `app/_layout.tsx:310`, `:392`) — o gate
   registra o seu próprio; `ocultarTranscricoes`; e mascarar o conteúdo no
   screenshot/app-switcher (`FLAG_SECURE`), que é sprint própria.

## Proof-of-work

```bash
npx tsc --noEmit                                # exit 0

# o gate passa a conhecer AppState (antes: zero ocorrencias no arquivo)
rg -n "AppState" src/lib/boot/biometriaGate.tsx # >= 2 (import + addEventListener)
rg -n "sub.remove" src/lib/boot/biometriaGate.tsx  # cleanup presente (A26)

npm test -- biometriaGate                       # 5 casos antigos + 6 novos verdes
npm test -- settings                            # slice privacidade com chave nao-booleana
npm test -- escreverEstado                      # espelho canonico aceita a chave optional
npm test -- restaurarVault                      # restore com privacidade estendida

# Gauntlet nao pode ter trancado (bypass intacto)
./gauntlet.sh                                   # navegar /settings e mais 2 rotas sem prompt
npm run test:e2e:web -- --grep audit-p1-6       # caso novo PASS

./scripts/smoke.sh                              # verde
```

Nível C (device, com permissão do dono): sequência autenticar → recentes → voltar
**dentro** do timeout (sem prompt) → recentes → esperar além do timeout → voltar
(**com** prompt). Evidência: dois `adb exec-out screencap` do retorno, um em cada
janela.

Screenshots em `docs/sprints/AUDIT-P1-6-BIOMETRIA-RELOCK-screenshots-gauntlet/`:
seção Privacidade com o toggle desligado (sem o controle de timeout) e ligado
(com o controle).

## Commit

```
feat: audit-p1-6 re-tranca gate de biometria ao voltar do background com timeout configuravel
```
