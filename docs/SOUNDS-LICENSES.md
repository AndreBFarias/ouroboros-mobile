SOUNDS-LICENSES — Licenças de áudio no Ouroboros Mobile
========================================================

Este arquivo registra a procedência e licença de todo asset
sonoro empacotado em release do app. Mantenha sincronizado
com os arquivos `CREDITS.md` em cada pasta de assets.

## Política

- Apenas áudio CC0 ou trabalho original gerado por ferramenta
  determinística (ffmpeg synth, sox, scipy).
- Nada de samples comerciais, gravações de músicas com direitos
  autorais, ou áudios de terceiros sem licença explícita.
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
Memórias quando o usuário liga o toggle `recapAmbientAudio` em
Configurações. Default OFF — usuário escolhe explicitamente.

## Outros assets sonoros

Atualmente o app usa apenas os sons de alarme e o ambient do
Recap Memórias. Caso uma sprint futura adicione (haptic-like UI
sounds, voz sintetizada, ringtones), criar nova seção neste
arquivo + um `CREDITS.md` na pasta correspondente.
