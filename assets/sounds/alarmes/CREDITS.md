Sons de alarme — Atribuição e licença
======================================

Os três arquivos `.wav` deste diretório são tons puros sintetizados
diretamente via `ffmpeg` no momento da sprint M16. Nenhuma gravação ou
amostra de terceiros foi utilizada.

Tom puro (sine wave) gerado matematicamente é trabalho não original
sob direito autoral em quase todos os ordenamentos jurídicos: trata-se
de um sinal periódico determinístico, sem expressão criativa. Os
arquivos são, portanto, equivalentes a domínio público / CC0.

Lista de arquivos
-----------------

- `gentle.wav` — sine 440 Hz, 1.5 s, mono 44.1 kHz, volume 0.4.
- `normal.wav` — sine 660 Hz, 1.5 s, mono 44.1 kHz, volume 0.6.
- `forte.wav`  — sine 880 Hz, 1.5 s, mono 44.1 kHz, volume 0.85.

Comando de geração
------------------

```
ffmpeg -y -f lavfi -t 1.5 -i "sine=frequency=<HZ>:duration=1.5" \
       -af "volume=<VOL>" -ar 44100 -ac 1 -c:a pcm_s16le <NOME>.wav
```

Substituição futura
-------------------

Caso se queira trocar por amostras de chimes / bells reais, recomenda-se
usar [freesound.org](https://freesound.org/) filtrando por licença CC0
e atualizar este arquivo com URL, autor e ID de cada amostra.
