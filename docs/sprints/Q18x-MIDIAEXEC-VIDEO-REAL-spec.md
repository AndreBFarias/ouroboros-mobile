# Q18.x — `MidiaExecucaoPlayer` com `<Video>` real do expo-av

> **Status:** [ok] entregue 2026-05-13 tarde. Smoke verde 195 suítes
> / 1932 testes. TS strict zero.
> **Tamanho:** Pequeno (1–2h) — fechado em ~15min (escopo cirúrgico
> menor que o estimado pela spec).
> **Pré-requisitos:** Q18 e Q18.b entregues. `expo-av` já está no
> bundle (alarme/diário usam).

## Contexto

`src/components/exercicios/MidiaExecucaoPlayer.tsx:64` tem o débito
explícito:

```ts
// Q18.x: integrar <Video> de expo-av com shouldPlay+isLooping+isMuted.
// Por enquanto fallback Image (alguns devices renderizam frame zero).
```

Quando o caller passa um `path` `.mp4`/`.mov`/`.webm`, o player
renderiza apenas o frame zero via `<Image>`. Resultado: vídeos
aparecem estáticos (parece bug, embora seja fallback intencional).

## Objetivo

Substituir o fallback `<Image>` por `<Video>` real do expo-av com:

- `shouldPlay`: true (autoplay)
- `isLooping`: true (loop infinito durante execução do treino)
- `isMuted`: true (zero som — convive com música em outras telas)
- `resizeMode`: cover (preserva enquadramento como o GIF)

Para GIF/JPG/PNG, manter o `<Image>` atual (não-quebrar).

## Decisões técnicas firmes

- **Detectar formato pela extensão.** Helper `ehVideo()` já existe no
  componente; reusar.
- **Carregamento lazy.** Importar `expo-av` via `require()` apenas
  quando `ehVideo(path)` retornar `true` — evita peso no bundle pra
  exercícios só com GIF.
- **Fallback ainda.** Se `expo-av` não estiver instalado no bundle
  (improvável), cair na lógica atual (Image com frame zero) sem
  crashar.

## Arquivos a modificar

- `src/components/exercicios/MidiaExecucaoPlayer.tsx`
  - Substituir o block `if (ehVideo(path)) { ... <Image> ... }` por
    branch que renderiza `<Video>` real com require lazy.
  - Não tocar nas outras 2 branches (empty state + GIF/JPG/PNG).

## Proof-of-work esperado

1. **GIF/JPG ainda renderizam** (regressão zero):
   ```bash
   # Abrir /exercicios/<slug> com gif=*.gif e *.jpg
   # Validação visual via Gauntlet ou celular.
   ```

2. **Vídeo MP4 anima**:
   ```bash
   # Cadastrar exercício com gif=*.mp4 anexo
   # Abrir detalhe → confirmar que anima em loop sem som.
   ```

3. **Smoke verde**:
   ```bash
   ./scripts/smoke.sh
   ```

## Critérios de aceite

- [ ] `<Video>` substitui `<Image>` no branch de vídeo do Player
- [ ] `shouldPlay+isLooping+isMuted` aplicados
- [ ] GIF/JPG não regridem (mesmo path branch antes)
- [ ] Fallback gracioso quando expo-av indisponível
- [ ] Smoke verde
- [ ] Sprint `[ok]` em ROADMAP + FEATURES-CANONICAS §4.5

## Anti-débito

Se `expo-av` for substituído por `expo-video` (Expo SDK 55 anuncia
migração), abrir Q18.x.b com a swap.
