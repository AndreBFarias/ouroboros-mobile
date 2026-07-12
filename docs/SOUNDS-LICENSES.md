SOUNDS-LICENSES — Licenças de áudio no Ouroboros Mobile
========================================================

Este arquivo registra a procedência e licença de todo asset
sonoro empacotado em release do app. Mantenha sincronizado
com os arquivos `CREDITS.md` em cada pasta de assets.

## Política

- Áudio **CC0** ou trabalho original gerado por ferramenta
  determinística (ffmpeg synth, sox, scipy); **ou CC BY** (Creative
  Commons Attribution) **desde que a atribuição obrigatória seja
  satisfeita dentro do app** — atualizado em R-RECAP-9 (2026-07-11).
  A CC BY é aceita porque o crédito visível resolve a única obrigação
  da licença; a tela de créditos (`/settings` → Sobre → Créditos)
  cumpre esse papel.
- Nada de samples comerciais, gravações de músicas com direitos
  autorais restritivos, ou áudios de terceiros sem licença explícita.
- Toda faixa CC BY **precisa** aparecer numa tela de créditos no app,
  com autor + licença + link, e no `CREDITS.md` da pasta.
- Mudança de origem (ex: substituir tom puro por sample CC0
  do freesound.org) deve atualizar este arquivo + o `CREDITS.md`
  da pasta no mesmo commit.

## Inventário

### `assets/sounds/alarmes/` — Alarmes pessoais (M16, R-NAV-2)

Detalhes técnicos completos em
[`assets/sounds/alarmes/CREDITS.md`](../assets/sounds/alarmes/CREDITS.md).

| Arquivo | Licença | Origem | Comando de geração |
|---|---|---|---|
| `gentle.wav` | CC0 / domínio público | ffmpeg synth (M16, 2026-05-01) | `sine 440 Hz × 1.5 s × 0.4` |
| `normal.wav` | CC0 / domínio público | ffmpeg synth (M16, 2026-05-01) | `sine 660 Hz × 1.5 s × 0.6` |
| `forte.wav` | CC0 / domínio público | ffmpeg synth (M16, 2026-05-01) | `sine 880 Hz × 1.5 s × 0.85` |
| `chime.wav` | CC0 / domínio público | ffmpeg synth (R-NAV-2, 2026-05-15) | acorde C maj com fade out |
| `marimba.wav` | CC0 / domínio público | ffmpeg synth (R-NAV-2, 2026-05-15) | sine 1046.5 Hz transiente |

Tons puros e acordes sintetizados são trabalhos não originais sob
direito autoral em quase todos os ordenamentos jurídicos
(determinísticos, sem expressão criativa). Tratamos como
equivalentes a CC0 / domínio público.

## Substituição por sample CC0 do freesound.org

Se uma sprint futura quiser substituir por gravações reais (chime
de sino físico, marimba acústica, etc.), o procedimento canônico
é:

1. Buscar em https://freesound.org/ filtrando por **Creative
   Commons 0**.
2. Baixar o `.wav` em mono 44.1 kHz, duração ≤ 2 s.
3. Substituir o arquivo `<som>.wav` mantendo nome estável (para
   não quebrar o `SOM_FILE` em `src/lib/services/alarmesNotificacoes.ts`).
4. Atualizar `assets/sounds/alarmes/CREDITS.md` com URL, autor,
   ID do sample.
5. Atualizar a tabela acima com nova origem.
6. Validar Nível B (emulador) ou Nível C (celular físico): criar
   alarme com som novo, confirmar disparo audível.

### `assets/sounds/ambient/` — Áudio ambient do Recap Memórias (R-RECAP-4)

Detalhes técnicos completos em
[`assets/sounds/ambient/CREDITS.md`](../assets/sounds/ambient/CREDITS.md).

| Arquivo | Licença | Origem | Comando de geração |
|---|---|---|---|
| `recap-memorias.mp3` | CC0 / domínio público | ffmpeg synth (R-RECAP-4, 2026-05-16) | drone harmônico 4 senóides A2/E3/A3/E4 × 60s × MP3 64kbit/s mono |

Tom de pad discreto pensado para servir de fundo ao slideshow
Memórias. **Aposentado como trilha padrão em R-RECAP-9** (2026-07-11):
o slideshow passou a sortear uma faixa animada do pool
`recap-musicas/` (abaixo). O arquivo e o toggle `recapAmbientAudio`
permanecem no código por retrocompatibilidade, mas não são mais o
controle da trilha do slideshow.

### `assets/sounds/recap-musicas/` — Trilha animada do Recap (R-RECAP-9)

Detalhes técnicos completos, atribuição e inventário faixa a faixa em
[`assets/sounds/recap-musicas/CREDITS.md`](../assets/sounds/recap-musicas/CREDITS.md).

- **16 faixas** de **Kevin MacLeod** (incompetech.com), licença
  **Creative Commons Attribution 4.0 (CC BY 4.0)**.
- Pool sorteado por sessão de slideshow (uma faixa por abertura,
  modelo Google Fotos "Memories"). Seletor determinístico em
  `src/lib/recap/musicaFundo.ts`; toggle `recapMusicaFundo`
  (default ON) + botão de som no header do slideshow.
- Faixas: Amazing Plan, Beachfront Celebration, Carefree, Cheery
  Monday, Fluffing a Duck, Fun in a Bottle, Happy Alley, Itty Bitty
  8 Bit, Jaunty Gumption, Life of Riley, Monkeys Spinning Monkeys,
  Off to Osaka, Pixelland, Sneaky Snitch, The Builder, Wallpaper.
- **Atribuição obrigatória** (CC BY) satisfeita pela seção "Créditos"
  em `/settings` → Sobre: "Músicas: Kevin MacLeod (incompetech.com) —
  CC BY 4.0" + link para `creativecommons.org/licenses/by/4.0/`.
- Recomprimidas para 128 kbps (`ffmpeg -b:a 128k -map_metadata -1`),
  metadados removidos.

## Outros assets sonoros

Atualmente o app usa apenas os sons de alarme e o ambient do
Recap Memórias. Caso uma sprint futura adicione (haptic-like UI
sounds, voz sintetizada, ringtones), criar nova seção neste
arquivo + um `CREDITS.md` na pasta correspondente.
