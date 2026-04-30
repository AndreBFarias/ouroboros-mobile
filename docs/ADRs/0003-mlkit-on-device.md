# ADR 0003 — ML Kit On-device, Sem Rede

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

OCR e document scanner via API cloud seriam mais precisos.

## Decisão

ML Kit local via @react-native-ml-kit, fallback Tesseract.js se falhar.
Zero tráfego de saída.

## Consequências

- Privacidade absoluta
- Funciona offline
- Grátis, sem rate limit
- Qualidade ~90% do cloud — fallback é form manual editável
- Modelo embarcado aumenta tamanho do APK em ~15MB
