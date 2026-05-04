# Sprint M-RELEASE-ASSETS — Ícone, splash, app name finais

```
DEPENDE:    nada
BLOQUEIA:   M41 (release final — placeholder no Play Store é vergonha)
ESTIMATIVA: 3-4h
PRIORIDADE: alta (identidade visual do produto)
```

## 1. Achado / motivação

`assets/` atualmente contém:
- `icon.png`, `adaptive-icon.png`, `icon-foreground.png`,
  `splash.png`, `splash-icon.png`, `favicon.png`.

Status real desses arquivos: **placeholders genéricos** (provável).
Auditoria visual confirma se já são finais ou não.

## 2. Objetivo

Garantir que ao instalar o APK v1.0:
- Launcher Android mostra ícone Ouroboros nítido em tema claro/escuro.
- Splash screen 2-3s mostra Ouroboros animação ou logo estático
  com fundo Dracula `#282a36`.
- Nome no launcher: "Ouroboros" (não "ouroboros-mobile").
- Adaptive-icon respeita máscara Android 13+ (foreground em
  círculo, sem corte de elementos críticos).
- Favicon web (Gauntlet) coerente.

## 3. Entregáveis

### Auditoria

- Renderizar `assets/*.png` em viewer + comparar contra
  `docs/BRIEFING.md` § paleta. Detectar placeholders.

### Assets novos

Se algum placeholder, gerar novo:
- `assets/icon.png` 1024×1024 — Ouroboros estilizado, fundo
  transparente ou Dracula.
- `assets/adaptive-icon.png` 432×432 (foreground only).
- `assets/icon-foreground.png` para dark mode.
- `assets/splash.png` — logo centralizado em fundo `#282a36`.
- `assets/splash-icon.png` — variante para SDK 54 splash module.
- `assets/favicon.png` 196×196.

### app.json

- `name: "Ouroboros"` (capitalização final).
- `slug` mantém `ouroboros-mobile` (interno).
- `splash.backgroundColor: "#282a36"`.
- `android.adaptiveIcon.backgroundColor: "#282a36"`.

### Validação Nível B (emulador)

- Build local APK preview, instalar no emulador, screenshot
  launcher + splash + abrir app.
- Salvar em `docs/sprints/M-RELEASE-ASSETS-screenshots-emulador/`.

## 4. Verificação

- Visual: ícone reconhecível em launcher 48dp.
- Adaptive-icon: foreground não cortado em máscara circular.
- Splash: sem flash branco antes (cobertura SDK 54).
- App name aparece como "Ouroboros" no launcher.

## 5. Decisões tomadas

- **Símbolo Ouroboros** (cobra que morde a cauda) é a identidade —
  já é o nome do projeto.
- **Sem texto no ícone** — apenas símbolo. Resiliente a tamanhos.
- **Cores: Dracula `#bd93f9` purple sobre `#282a36` bg**.
- **Field test inclui validação visual real** no celular do dono.

## 6. Pendências de criação artística

Se o dono não tiver designer, materializar caminho com **SVG
gerado proceduralmente** baseado em `OuroborosLogo.tsx` existente —
exporta para PNG nas resoluções necessárias via script.
