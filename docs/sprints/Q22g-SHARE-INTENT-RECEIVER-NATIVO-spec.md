# Q22.G — Share intent Pix não dispara handler (receiver nativo ausente)

> **Status:** spec aberta 2026-05-13 madrugada (validação live alpha-6).
> **Tamanho:** Médio (3-5h) — depende `expo-share-intent` ou plugin
> nativo equivalente.
> **Bloqueia v1.0.0?** Não — feature Q20 (Pix runtime) já está
> documentada como pendente; este spec materializa a causa raiz
> da falha de runtime.

## Reprodução (validação live alpha-6 2026-05-13)

1. Abrir app bancário (Nubank/Itaú/Bradesco).
2. Compartilhar um comprovante PIX.
3. **PASS esperado**: Ouroboros aparece no sheet do Android → tap →
   tela de classificação `/share-receive` abre com o arquivo
   pré-carregado.
4. **Bug observado**: Ouroboros aparece no sheet → tap → app abre
   na Home, **handler nunca dispara**. Arquivo perdido.

## Causa raiz

`app.json` declara `intentFilters` corretamente (`SEND` aceita
`image/*`, `application/pdf`, `text/plain`, `text/html`,
`application/octet-stream`). O Android encontra a activity, abre o
app, mas o intent **nunca chega ao JS layer**.

Implementação atual em `src/lib/boot/deepLink.ts` usa
`Linking.addEventListener('url', ...)` que escuta **deep links**
(`ouroboros://...`), não **intents action.SEND** com
`EXTRA_STREAM`/`EXTRA_TEXT`. Apps Android nativos roteam intents
SEND para `MainActivity.onNewIntent()` com os extras em Bundle —
sem ponte JS, esse Bundle é descartado.

Conclusão: a feature **foi declarada mas o receiver nativo nunca
foi implementado**. O AndroidManifest aparece corretamente como
opção de share, daí o user vê o ícone Ouroboros no sheet do Android.
Mas ao escolher, só MainActivity é launched sem que nada do payload
chegue ao código.

## Decisões técnicas firmes

### Opção A — `expo-share-intent` (recomendado)

Library config-plugin pronta que monta o receiver nativo:

```bash
npx expo install expo-share-intent
```

Adicionar em `app.json` plugins:

```json
{
  "plugins": [
    [
      "expo-share-intent",
      {
        "iosActivationRules": { ... },
        "androidIntentFilters": ["text/*", "image/*", "application/pdf"]
      }
    ]
  ]
}
```

API JS:

```ts
import { useShareIntent } from 'expo-share-intent';

const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

useEffect(() => {
  if (hasShareIntent) {
    router.push({
      pathname: '/share-receive',
      params: {
        uri: shareIntent.files?.[0]?.path,
        mime: shareIntent.files?.[0]?.mimeType,
        nome: shareIntent.files?.[0]?.fileName,
        origem: shareIntent.sourceApp,
        texto: shareIntent.text,
      },
    });
    resetShareIntent();
  }
}, [hasShareIntent, shareIntent]);
```

Pros: pronto, mantido, suporta Android+iOS.
Cons: dependência nova, prebuild precisa rodar pra integrar plugin.

### Opção B — módulo nativo custom

Escrever ContentReceiverActivity em Kotlin que escuta intent SEND,
salva o conteúdo em cache, dispara deep link `ouroboros://share?uri=cached_path`,
que aí roda pelo handler atual.

Pros: zero deps externas.
Cons: maintenance, código nativo, +1h-2h dev.

**Decisão**: Opção A. Menor risco, suporte ativo.

## Arquivos a modificar

- `package.json` + `package-lock.json` — adicionar `expo-share-intent`
- `app.json` — adicionar plugin + remover `intentFilters` manuais
  (o plugin gerencia)
- `app/_layout.tsx` — adicionar listener `useShareIntent` no
  RootLayout
- `src/lib/boot/deepLink.ts` — manter como fallback pra deep links
  custom-scheme, mas remover lógica de share intent (delegada ao
  plugin)

## Proof-of-work esperado

1. Build alpha-N com `expo-share-intent` instalado.
2. Compartilhar PIX do Nubank: Ouroboros aparece, tap → tela
   `/share-receive` abre com URI + mime + nome + origem.
3. Salvar → arquivo persiste em `pdf/` ou `jpg/` no Vault.
4. Smoke verde.

## Critérios de aceite

- [ ] `expo-share-intent` instalado e configurado no plugin
- [ ] Share intent de Nubank/Itaú/Bradesco/Inter/C6 abre tela
      `/share-receive` automaticamente
- [ ] Arquivo salva em inbox/financeiro conforme já specado em Q20
- [ ] Smoke verde + screenshots Gauntlet
- [ ] Sprint marcada `[ok]` em ROADMAP

## Anti-débito

Se `expo-share-intent` quebrar em release futura do Expo SDK,
abrir Q22.G.b cobrindo a migração para o sucessor.
