// R-CRIT-3 (2026-05-16): testes da agregacao de midias standalone no
// Recap. Cobre o pedacao que estava ausente antes do fix:
//
//   - foto/audio/video capturados via FAB (sem registro-mae) contam em
//     numeros.fotos / numeros.audios / numeros.videos.
//   - midia fora do range NAO entra na contagem (filtro periodo).
//   - midia embutida em diario continua contando em fotos (sem
//     duplicar).
//   - midia_frase nao conta em fotos/audios/videos.
//
// Comentarios sem acento (convencao shell/CI).
import { agregarRecap } from '@/lib/hooks/useRecap';
import type { ItemMidiaStandalone } from '@/lib/vault/midiaCompanion';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';

const agora = new Date('2026-05-16T12:00:00-03:00');
const range = {
  de: new Date('2026-05-10T00:00:00-03:00'),
  ate: new Date('2026-05-16T23:59:59-03:00'),
};

function midia(
  tipo: ItemMidiaStandalone['tipo'],
  data: string
): ItemMidiaStandalone {
  return {
    tipo,
    data,
    companionUri: `content://vault/markdown/${tipo}-${data}.md`,
    binarioPath:
      tipo === 'midia_frase'
        ? null
        : tipo === 'midia_foto'
          ? `jpg/foto-${data}.jpg`
          : tipo === 'midia_audio'
            ? `m4a/audio-${data}.m4a`
            : tipo === 'midia_video'
              ? `mp4/video-${data}.mp4`
              : `pdf/scanner-${data}.pdf`,
  };
}

function humor(data: string): HumorMeta {
  return {
    tipo: 'humor',
    data,
    autor: 'pessoa_a',
    humor: 3,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
  };
}

function diarioComFoto(data: string): DiarioEmocionalMeta {
  return {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_a',
    modo: 'conquista',
    emocoes: [],
    intensidade: 3,
    com: [],
    contexto_social: [],
    texto: 'tinha foto',
    midia: [{ tipo: 'foto', path: 'jpg/foto-x.jpg' }],
    para: { tipo: 'mim' },
  };
}

function eventoSemMidia(data: string): EventoMeta {
  return {
    tipo: 'evento',
    data,
    autor: 'pessoa_a',
    modo: 'positivo',
    com: [],
    intensidade: 3,
    fotos: [],
    midia: [],
    para: { tipo: 'mim' },
    categoria: 'lazer',
  };
}

describe('agregarRecap + midiasStandalone (R-CRIT-3)', () => {
  it('conta midia standalone dentro do periodo em numeros.fotos/audios/videos', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      midiasStandalone: [
        midia('midia_foto', '2026-05-12'),
        midia('midia_foto', '2026-05-13'),
        midia('midia_audio', '2026-05-14'),
        midia('midia_video', '2026-05-15'),
        midia('midia_frase', '2026-05-15'),
      ],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.numeros.fotos).toBe(2);
    expect(data.numeros.audios).toBe(1);
    expect(data.numeros.videos).toBe(1);
    // Frase nao conta em fotos/audios/videos.
    expect(
      data.numeros.fotos + data.numeros.audios + data.numeros.videos
    ).toBe(4);
  });

  it('descarta midia fora do periodo (data anterior a `de`)', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      midiasStandalone: [
        // 2026-05-01: anterior a range.de = 2026-05-10 -> deve sair.
        midia('midia_foto', '2026-05-01'),
        // 2026-05-12: dentro do range -> deve entrar.
        midia('midia_foto', '2026-05-12'),
      ],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.numeros.fotos).toBe(1);
  });

  it('soma fotos embutidas em diario com fotos standalone (sem duplicar)', () => {
    const data = agregarRecap({
      humor: [humor('2026-05-12')],
      diarios: [diarioComFoto('2026-05-13T10:00:00-03:00')],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      midiasStandalone: [
        // 1 foto standalone via FAB.
        midia('midia_foto', '2026-05-14'),
      ],
      de: range.de,
      ate: range.ate,
      agora,
    });
    // 1 embutida (diario) + 1 standalone (FAB) = 2.
    expect(data.numeros.fotos).toBe(2);
  });

  it('quando midiasStandalone omitido, comportamento legado (somente embutidas)', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [diarioComFoto('2026-05-13T10:00:00-03:00')],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    // 1 foto embutida no diario. audios=0, videos=0.
    expect(data.numeros.fotos).toBe(1);
    expect(data.numeros.audios).toBe(0);
    expect(data.numeros.videos).toBe(0);
  });

  it('evento sem midia + audio standalone -> audio entra mesmo sem registro mae', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [eventoSemMidia('2026-05-14T10:00:00-03:00')],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      midiasStandalone: [midia('midia_audio', '2026-05-14')],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.numeros.audios).toBe(1);
    expect(data.numeros.fotos).toBe(0);
  });
});
