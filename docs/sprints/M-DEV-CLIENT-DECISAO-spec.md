# Sprint M-DEV-CLIENT-DECISAO — v1.0 com ou sem features dev-client

```
DEPENDE:    decisão do dono
BLOQUEIA:   M41 (define escopo final)
ESTIMATIVA: 0,5h (decisão + atualização ROADMAP)
PRIORIDADE: alta (define rumo do release)
STATUS:     [ok] fechada 2026-05-05
```

## 0. Resolução

**Decisão (a) registrada formalmente** em 2026-05-04 e confirmada
em 2026-05-05: v1.0 INCLUI as 4 features bloqueadas por EAS
dev-client APK (M06.5, M07.x, M11.5, M09) + 2 features Google
Calendar (M37.1, M37.2 com pausa para OAuth).

ROADMAP atualizado (Bloco E com 6 sprints: E1=M06.5, E2=M07.x,
E3=M11.5, E4=M09, E5=M37.1, E6=M37.2). Pré-requisito antes de
iniciar E1: build EAS dev-client APK fresh (cota free 30/mês).

Sprint encerrada sem necessidade de código — somente decisão
durável documentada.

## 1. Achado / motivação

4 sprints estão bloqueadas por **EAS dev-client APK** (não Expo Go):
- **M06.5** — Microfone (transcrição on-device para Diário Emocional).
- **M07.x** — Conquistas com mídia obrigatória (4 tipos: foto/audio/
  Spotify oEmbed/YouTube oEmbed).
- **M11.5** — Calendário visual de conquistas (Tela 25).
- **M09** — Scanner OCR de notas fiscais (ML Kit on-device).

EAS dev-client APK existe localmente em
`builds/dev-client-20260501-225715.apk` (207 MB, gerado em M00.5).
Próximo build: `EXPO_TOKEN=<token> eas build --platform android
--profile development`. Cota EAS free 30 builds/mês.

## 2. Decisão do dono (registrada 2026-05-04)

**Opção (a) — INCLUI as 4 sprints em v1.0.**

Justificativa:
- Microfone é **diferencial único** vs apps de diário comuns.
- Scanner OCR resolve fricção real (nota fiscal sem digitação).
- Conquistas com mídia + calendário visual são "fechamento
  emocional" (objetivo principal do projeto — espelho otimista).
- Esperar EAS buildar não é gargalo crítico (algumas horas).

## 3. Plano de execução

### Ordem das 4 sprints dev-client

Após Bloco A (Fundação) + Bloco B (Polish UX) + Bloco C
(Release-readiness) fecharem:

1. **M06.5** Microfone — primeira (base para M07.x audio).
2. **M07.x** Conquistas mídia — depende de M06.5.
3. **M11.5** Calendário conquistas — depende de M07.x.
4. **M09** Scanner OCR — paralelo a M11.5 (sem dependência).

Estimativa total: 23-31h (5-7h cada).

### Build EAS dev-client

Antes de iniciar M06.5:
```bash
EXPO_TOKEN=<token> eas build --platform android \
  --profile development --non-interactive --no-wait
```

Aguardar APK pronto, instalar em celular físico via ADB.

## 4. Entregáveis

- Atualização desta spec com data da decisão (já feita).
- ROADMAP.md atualizado com Bloco E (dev-client) renumerado.
- M41 spec atualizado para incluir as 4 sprints como dependência.

## 5. Risco aceito

- **Atraso de release**: ~25-30h adicionais antes de M41.
- **Dependência EAS**: se cota mensal estourar, esperar reset.
- **Dev-client APK**: precisa instalação manual em celular do dono
  para testes de microfone e câmera real.

Dono aceita esses riscos para entregar produto v1.0 completo.
