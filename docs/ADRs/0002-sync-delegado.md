# ADR 0002 — Sync Delegado ao Syncthing/Obsidian Sync

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Dois usuários, dois aparelhos + 1 desktop. Sync próprio exigiria
backend, auth e resolução de conflitos.

## Decisão

Sync roda fora do App. Ouroboros-mobile só observa status e mostra na
UI. Conflitos resolvidos no desktop via merge manual.

## Consequências

- Zero infra própria
- Usuários já têm Syncthing rodando
- Privacidade absoluta (p2p, sem nuvem terceira)
- Usuário precisa configurar sync uma vez — onboarding tela 24 frame 3 cobre
- Conflito de nome de arquivo possível — schemas mitigam com timestamp HHmmss
