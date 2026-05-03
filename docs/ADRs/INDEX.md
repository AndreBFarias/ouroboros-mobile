# Architecture Decision Records — Ouroboros Mobile

Os ADRs aqui são imutáveis após mergeados. Mudanças viram ADR nova
com referência "Supersedes ADR-NNNN" no cabeçalho.

| ID | Título | Status | Sprint |
|---|---|---|---|
| 0001 | Vault em Markdown Puro | Aceito | M01 |
| 0002 | Sync Delegado ao Syncthing/Obsidian Sync | Aceito | M01 |
| 0003 | ML Kit On-device, Sem Rede | Aceito | M01 |
| 0004 | Mobile Só Captura, Desktop Processa | Aceito | M01 |
| 0005 | Sem Gamificação, Intencional | Aceito | M01 |
| 0006 | Stack Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui | Aceito | M01 |
| 0007 | Zero Telemetria, Zero Analytics, Zero Crash Reporting Remoto | Aceito | M01 |
| 0008 | Tema Custom em tokens.ts, Não Material 3 | Aceito | M01 |
| 0009 | Validação por Anotação Runtime (zod) | Aceito | M01 |
| 0010 | Estética Como Fundação, Não Polimento | Aceito | M01 |
| 0011 | Identidade de Pessoas Genérica (PESSOA_A / PESSOA_B) | Aceito (estendido por ADR-0015) | M01 |
| 0012 | Cache Mobile Readonly Gerado pelo Backend | Aceito | M00.docs |
| 0013 | Capitalização da UI: Sentence Case com Acentuação PT-BR | Aceito (revoga BRIEFING §1 e §2.4) | M01.5 |
| 0014 | Vault Mobile em Pasta Dedicada (~/Protocolo-Ouroboros/) | Aceito | M03 + M00.docs |
| 0015 | Identidade de Pessoas em Runtime com Nome e Foto | Aceito (estende ADR-0011) | M03 + M03.2 + M00.docs |
| 0016 | Vault Auto-criado em /sdcard/Documents/Ouroboros sem SAF | Aceito (estende ADR-0014) | M22 (refundação v1.0) |
| 0017 | Mídia em Formato Original com .md Companion | Aceito | M39 (refundação v1.0) |
| 0018 | OAuth Google: split clientId + cache em arquivo + escopo mínimo | Aceito (estende ADR-0007) | M37.1 + M37.2 (refundação v1.0) |
