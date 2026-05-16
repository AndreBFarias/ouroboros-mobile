Sons de alarme — Atribuição e licença
======================================

Os cinco arquivos `.wav` deste diretório são tons sintetizados
diretamente via `ffmpeg` no momento das sprints M16 (3 originais) e
R-NAV-2 (2 novos). Nenhuma gravação ou amostra de terceiros foi
utilizada.

Tons puros e acordes sintetizados matematicamente são trabalho não
original sob direito autoral em quase todos os ordenamentos
jurídicos: trata-se de sinais periódicos determinísticos, sem
expressão criativa. Os arquivos são, portanto, equivalentes a
domínio público / CC0.

Lista de arquivos
-----------------

- `gentle.wav` — sine 440 Hz, 1.5 s, mono 44.1 kHz, volume 0.4.
- `normal.wav` — sine 660 Hz, 1.5 s, mono 44.1 kHz, volume 0.6.
- `forte.wav`  — sine 880 Hz, 1.5 s, mono 44.1 kHz, volume 0.85.
- `chime.wav`  — acorde C maj (523.25 + 659.25 + 783.99 Hz),
                 1.8 s, mono 44.1 kHz, fade out de 1.5 s, volume
                 mixado 0.35/0.25/0.20.
- `marimba.wav`— sine 1046.5 Hz (C6), 1.5 s, mono 44.1 kHz,
                 fast attack + long decay, volume inicial 0.5.

Comandos de geração
-------------------

Tons puros (gentle/normal/forte):
```
ffmpeg -y -f lavfi -t 1.5 -i "sine=frequency=<HZ>:duration=1.5" \
       -af "volume=<VOL>" -ar 44100 -ac 1 -c:a pcm_s16le <NOME>.wav
```

Chime (acorde harmônico com fade):
```
ffmpeg -y \
  -f lavfi -t 1.8 -i "sine=frequency=523.25:duration=1.8" \
  -f lavfi -t 1.8 -i "sine=frequency=659.25:duration=1.8" \
  -f lavfi -t 1.8 -i "sine=frequency=783.99:duration=1.8" \
  -filter_complex "[0:a]volume=0.35,afade=t=out:st=0.3:d=1.5[a0]; \
                   [1:a]volume=0.25,afade=t=out:st=0.3:d=1.5[a1]; \
                   [2:a]volume=0.20,afade=t=out:st=0.3:d=1.5[a2]; \
                   [a0][a1][a2]amix=inputs=3:normalize=0" \
  -ar 44100 -ac 1 -c:a pcm_s16le chime.wav
```

Marimba (transiente com decay rápido):
```
ffmpeg -y -f lavfi -t 1.5 -i "sine=frequency=1046.5:duration=1.5" \
  -af "volume=0.5,afade=t=in:st=0:d=0.02,afade=t=out:st=0.05:d=1.4" \
  -ar 44100 -ac 1 -c:a pcm_s16le marimba.wav
```

Substituição futura
-------------------

Caso se queira trocar por amostras de chimes / bells reais,
recomenda-se usar [freesound.org](https://freesound.org/) filtrando
por licença CC0 e atualizar este arquivo com URL, autor e ID de
cada amostra. O nome do arquivo precisa permanecer estável
(`<som>.wav`) para não quebrar o mapa `SOM_FILE` em
`src/lib/services/alarmesNotificacoes.ts`.
