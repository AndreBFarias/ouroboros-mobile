Áudio ambient do modo Memórias — Atribuição e licença
======================================================

O arquivo `recap-memorias.mp3` é um drone harmônico sintetizado
diretamente via `ffmpeg` na sprint R-RECAP-4 (2026-05-16).
Nenhuma gravação ou amostra de terceiros foi utilizada.

Tons puros e mistura harmônica de senóides matematicamente
determinísticas são trabalhos não originais sob direito autoral
em quase todos os ordenamentos jurídicos: sinais periódicos sem
expressão criativa. O arquivo é, portanto, equivalente a domínio
público / CC0.

Lista de arquivos
-----------------

- `recap-memorias.mp3` — drone harmônico de quatro senóides em
  intervalos consonantes (A2 110 Hz, E3 164.81 Hz, A3 220 Hz,
  E4 329.63 Hz). Duração 60s, MP3 mono 22.05 kHz @ 64 kbit/s.
  Fade-in e fade-out independentes por camada (3s a 6s) para
  evitar entrada/saída abrupta quando o loop reinicia. Volume
  máximo somado ~ -18 dBFS para servir de pad discreto sob
  narração visual do slideshow Memórias.

Comando de geração
------------------

```
ffmpeg -y \
  -f lavfi -t 60 -i "sine=frequency=110:duration=60" \
  -f lavfi -t 60 -i "sine=frequency=164.81:duration=60" \
  -f lavfi -t 60 -i "sine=frequency=220:duration=60" \
  -f lavfi -t 60 -i "sine=frequency=329.63:duration=60" \
  -filter_complex "[0:a]volume=0.12,afade=t=in:st=0:d=3,afade=t=out:st=57:d=3[a0]; \
                   [1:a]volume=0.08,afade=t=in:st=0:d=4,afade=t=out:st=56:d=4[a1]; \
                   [2:a]volume=0.10,afade=t=in:st=1:d=5,afade=t=out:st=55:d=4[a2]; \
                   [3:a]volume=0.06,afade=t=in:st=2:d=6,afade=t=out:st=54:d=5[a3]; \
                   [a0][a1][a2][a3]amix=inputs=4:normalize=0" \
  -ar 22050 -ac 1 -b:a 64k recap-memorias.mp3
```

Substituição futura
-------------------

Caso uma sprint futura queira trocar por sample CC0 do
freesound.org (ex: gravação de campo, sino tibetano, pad
sintético), o procedimento é:

1. Buscar em https://freesound.org/ filtrando por **Creative
   Commons 0**.
2. Baixar em MP3 mono ≤500KB, duração 30 a 60s.
3. Substituir mantendo o mesmo nome `recap-memorias.mp3`.
4. Atualizar este arquivo com URL, autor e ID do sample.
5. Atualizar `docs/SOUNDS-LICENSES.md` no mesmo commit.
