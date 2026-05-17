// R-MEDIA-2 (2026-05-16): testes da extracao de `audioPath` em
// agregarRecap a partir de meta.midia[]. Diarios e eventos podem ter
// um item com tipo='audio' e path apontando para o m4a no Vault. O
// agregador deve copiar esse path para ConquistaItem/CriseItem/
// ReflexaoItem.audioPath. Sem audio anexado, audioPath fica null.
//
// Comentarios sem acento (convencao shell/CI).
import { agregarRecap } from '@/lib/hooks/useRecap';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';

function diarioComAudio(
  data: string,
  modo: 'gatilho' | 'conquista' | 'reflexao',
  audioPath: string | null
): DiarioEmocionalMeta {
  const midia: DiarioEmocionalMeta['midia'] =
    audioPath != null
      ? [{ tipo: 'audio', path: audioPath, duracao_seg: 12 }]
      : modo === 'conquista'
      ? [{ tipo: 'foto', path: 'media/fotos/placeholder.jpg' }]
      : [];
  return {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_a',
    modo,
    emocoes: [],
    intensidade: 3,
    com: [],
    contexto_social: [],
    texto: 'texto',
    midia,
    para: { tipo: 'mim' },
  };
}

function eventoComAudio(
  data: string,
  modo: 'positivo' | 'negativo',
  audioPath: string | null
): EventoMeta {
  const midia: EventoMeta['midia'] =
    audioPath != null
      ? [{ tipo: 'audio', path: audioPath, duracao_seg: 15 }]
      : modo === 'positivo'
      ? [{ tipo: 'foto', path: 'media/fotos/y.jpg' }]
      : [];
  return {
    tipo: 'evento',
    data,
    autor: 'pessoa_a',
    modo,
    com: [],
    intensidade: 4,
    fotos: [],
    midia,
    para: { tipo: 'mim' },
    categoria: 'lazer',
  };
}

const RANGE = {
  de: new Date('2026-05-01T00:00:00-03:00'),
  ate: new Date('2026-05-31T23:59:59-03:00'),
};

describe('agregarRecap propagacao de audioPath (R-MEDIA-2)', () => {
  it('ConquistaItem (diario_vitoria) leva audioPath do meta.midia', () => {
    const d = diarioComAudio(
      '2026-05-10',
      'conquista',
      'media/m4a/audio-conquista.m4a'
    );
    const r = agregarRecap({
      humor: [],
      diarios: [d],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    const conquistaItem = r.conquistas.find(
      // test-data-allow: categoria canonica.
      (c) => c.origem === 'diario_vitoria'
    );
    expect(conquistaItem).toBeDefined();
    expect(conquistaItem?.audioPath).toBe('media/m4a/audio-conquista.m4a');
  });

  it('ConquistaItem (evento_positivo) leva audioPath do meta.midia', () => {
    const e = eventoComAudio(
      '2026-05-12',
      'positivo',
      'media/m4a/audio-evento.m4a'
    );
    const r = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [e],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    const conquistaItem = r.conquistas.find(
      (c) => c.origem === 'evento_positivo'
    );
    expect(conquistaItem?.audioPath).toBe('media/m4a/audio-evento.m4a');
  });

  it('CriseItem (diario_trigger) leva audioPath do meta.midia', () => {
    const d = diarioComAudio(
      '2026-05-11',
      'gatilho',
      'media/m4a/audio-trigger.m4a'
    );
    const r = agregarRecap({
      humor: [],
      diarios: [d],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    const criseItem = r.crises.find((c) => c.origem === 'diario_trigger');
    expect(criseItem?.audioPath).toBe('media/m4a/audio-trigger.m4a');
  });

  it('ReflexaoItem leva audioPath do meta.midia', () => {
    const d = diarioComAudio(
      '2026-05-09',
      'reflexao',
      'media/m4a/audio-reflexao.m4a'
    );
    const r = agregarRecap({
      humor: [],
      diarios: [d],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    expect(r.reflexoes).toHaveLength(1);
    expect(r.reflexoes[0]?.audioPath).toBe('media/m4a/audio-reflexao.m4a');
  });

  it('audioPath = null quando meta.midia nao tem item tipo=audio', () => {
    // Item de conquista com somente foto (sem audio).
    const d = diarioComAudio('2026-05-10', 'conquista', null);
    const r = agregarRecap({
      humor: [],
      diarios: [d],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    const conquistaItem = r.conquistas.find(
      // test-data-allow: categoria canonica.
      (c) => c.origem === 'diario_vitoria'
    );
    expect(conquistaItem?.audioPath).toBeNull();
  });

  it('primeiro audio anexado vence quando ha multiplos', () => {
    // Caso patologico: meta.midia com 2 audios. Heuristica do
    // agregador: primeiro em ordem (preserva ordem de captura do
    // usuario). Documenta o comportamento atual.
    const d: DiarioEmocionalMeta = {
      tipo: 'diario_emocional',
      data: '2026-05-15',
      autor: 'pessoa_a',
      modo: 'conquista',
      emocoes: [],
      intensidade: 3,
      com: [],
      contexto_social: [],
      texto: 'texto',
      midia: [
        { tipo: 'audio', path: 'media/m4a/audio-primeiro.m4a', duracao_seg: 5 },
        { tipo: 'audio', path: 'media/m4a/audio-segundo.m4a', duracao_seg: 8 },
      ],
      para: { tipo: 'mim' },
    };
    const r = agregarRecap({
      humor: [],
      diarios: [d],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: RANGE.de,
      ate: RANGE.ate,
    });
    const conquistaItem = r.conquistas.find(
      // test-data-allow: categoria canonica.
      (c) => c.origem === 'diario_vitoria'
    );
    expect(conquistaItem?.audioPath).toBe('media/m4a/audio-primeiro.m4a');
  });
});
