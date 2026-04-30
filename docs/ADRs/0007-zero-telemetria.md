# ADR 0007 — Zero Telemetria, Zero Analytics, Zero Crash Reporting Remoto

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Prática padrão em Apps modernos é instrumentar com Firebase Analytics,
Sentry, Crashlytics. Todos exigem call de rede + envio de dado.

## Decisão

Zero. Não instalamos analytics, não instalamos crash reporter remoto.
Crashes são logados localmente em
`vault/.ouroboros/cache/crashlog/YYYY-MM-DD.log`.

## Consequências

- Privacidade absoluta
- Compliance trivial (não há dado para LGPD reclamar)
- Usuário sabe que nada sai do device
- Debug remoto é mais difícil — mas o dev é o usuário, então logcat resolve
