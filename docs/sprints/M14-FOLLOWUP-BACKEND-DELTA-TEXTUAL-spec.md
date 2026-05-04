# Sprint M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL — Backend Python com acentuação completa

```
DEPENDE:    M14 fechada (Mobile renderiza delta_textual)
            + repositorio Backend protocolo-ouroboros (modulo MOB-bridge-2)
BLOQUEIA:   nenhuma
ESTIMATIVA: 0,5h
PRIORIDADE: baixa (Mobile renderiza string opaca, cosmetico)
STATUS:     [todo] [para] (sprint paralela em outro repositorio)
```

## 1. Contexto

`MOB-bridge-2` no repo `protocolo-ouroboros` (Python) gera
`financas-cache.json` com campo `delta_textual` que vem sem
acentuação completa, ex.: `"abaixo da media"` em vez de
`"abaixo da média"`. Mobile só renderiza a string opaca conforme
ADR-0005 (Mobile não acentua textos do Backend).

## 2. Objetivo

Corrigir o gerador de `delta_textual` no Python para emitir
strings com acentuação PT-BR completa.

## 3. Localização do fix

Repositório: `protocolo-ouroboros` (separado deste projeto Mobile).
Arquivo: `src/mobile_cache/financas_cache.py`.
Função suspeita: alguma `montar_delta_textual()` ou similar que
formata frases como `"abaixo da media", "acima da media", "no
mesmo nivel"`.

## 4. Fix esperado

Substituir literais sem acento por versões com acento:
- `"abaixo da media"` → `"abaixo da média"`
- `"acima da media"` → `"acima da média"`
- `"no mesmo nivel"` → `"no mesmo nível"`
- `"ultima semana"` → `"última semana"`
- (qualquer outra ocorrência detectada via grep).

## 5. Verificação

```bash
# No repo protocolo-ouroboros
cd ../protocolo-ouroboros
grep -rn "media\|nivel\|ultima" src/mobile_cache/financas_cache.py
# Substituir literais conforme §4
pytest tests/mobile_cache/test_financas_cache.py
```

Após push do fix Backend, regenerar `financas-cache.json` no Vault
e validar visualmente em Mobile (rota `/financas`) que o texto
aparece acentuado.

## 6. Restrições

- Sprint paralela: NÃO toca neste repo Mobile.
- Anonimato absoluto no Python também.

## 7. Aritmética

- Mobile: nenhuma mudança.
- Python: testes do `mobile_cache` continuam passando, +1-2 testes
  de acentuação se ainda não houver.

Sprint pronta para execução em sessão paralela do repositório
Backend.
