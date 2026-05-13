# Q22.A — Transcrição duplica texto em loop no diário

> **Status:** [ok] entregue 2026-05-13 noite (mesma sessão da
> validação live alpha-4).
> **Tamanho:** Trivial (15 min).
> **Bloqueia v1.0.0?** Sim — feature core do diário inutilizada com
> texto vazando 3-5x.

## Reprodução (descoberto na validação live alpha-4)

1. Drawer → Voz → sheet "Diário emocional".
2. Tap-hold no botão "Transcrever" (laranja).
3. Falar uma frase de ~5s ("Olá pessoal, isso é um teste com meu áudio.").
4. Soltar o botão.
5. **Bug:** textarea "O que aconteceu?" recebe a mesma frase repetida
   3-5 vezes (concatenada com espaço). Cada partial result do
   Android SpeechRecognizer foi appendado cumulativamente.

Evidência: screenshot do dono em 2026-05-13 (não commitado por
expor texto da gravação real).

## Causa raiz

`src/components/diario/TranscreverButton.tsx` chamava
`onTextoTranscrito(parcial)` a cada `transcribeStream` callback
(partials chegam a cada ~200ms durante a fala).

Caller em `app/diario-emocional.tsx`:

```ts
<TranscreverButton
  onTextoTranscrito={(transcrito) => {
    setTexto((prev) => `${prev.trimEnd()} ${transcrito.trim()}`);
  }}
/>
```

Append cumulativo × N partials = duplicação visível.

## Fix

API do `TranscreverButton` separada em duas:

- `onTextoTranscrito`: chamado **uma única vez** no release do botão,
  com o texto final consolidado. Caller pode append/sobrescrever sem
  risco.
- `onPreviewParcial?` (opcional): chamado a cada partial. Para
  preview live em **outra área** da UI, nunca no textarea destino.

No diário, `onPreviewParcial` é omitido — UX perde feedback "vejo
texto aparecendo enquanto falo" mas ganha texto final correto. Pode
ser readicionado depois apontando para componente separado.

## Arquivos modificados

- `src/components/diario/TranscreverButton.tsx` — interface +
  callback split + nota Q22.A no header docstring.
- (Caller `app/diario-emocional.tsx` não precisou mudar — agora
  recebe 1 chamada com texto final, append funciona corretamente.)

## Validação

- Typecheck verde (TS strict 0).
- Smoke 195 suítes / 1932 testes verde (sem testes novos — caller
  React Native exigiria setup de mock pesado; cobertura via
  validação live no celular).
- **Dono valida manual no próximo build com fix:** repetir o
  fluxo de reprodução, confirmar que a transcrição aparece UMA VEZ
  no textarea após release do botão.

## Anti-débito

Quando o dono pedir preview live de volta, abrir Q22.A.b adicionando
um `<Text>` muted-decor abaixo do botão Transcrever consumindo
`onPreviewParcial` — sem mexer no textarea principal.
