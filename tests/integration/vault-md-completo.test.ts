// Sprint M-VAULT-MD-AUDIT — auditoria integrada da filosofia
// "dados sao arquivos". Para cada feature do app, montamos um meta
// candidato, gravamos o .md (e o binario quando aplicavel) em um
// vault temporario real (tmpdir Node), e verificamos:
//
//   1. .md materializado no path canonico esperado.
//   2. Binario em path canonico (mídia / fotos auxiliares) quando
//      a feature produzir.
//   3. Companion .md ao lado do binario (M34 + M39 contract) quando
//      for media/<categoria>.
//   4. Frontmatter parseavel pelo YAML strict (round-trip do
//      stringifyFrontmatter -> parseFrontmatter).
//   5. Caracteres proibidos ausentes do path canonico (cross-OS:
//      <>:"|?*\ e ':' problematico em Mac/Obsidian).
//
// Este teste nao roda os helpers de I/O (saveHumor, escreverContador
// etc.) porque eles dependem de SAF/RN. Em vez disso, replicamos o
// contrato funcional: monta meta, escreve via fs Node usando
// stringifyFrontmatter (modulo puro). Isso prova que o vocabulario
// (path + schema + frontmatter) gera artefato Obsidian-friendly.
//
// Comentarios sem acento (convencao shell/CI).
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import YAML from 'yaml';

import { stringifyFrontmatter, parseFrontmatter } from '@/lib/vault/frontmatter';
import {
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  marcosPath,
  medidasPath,
  treinosPath,
  alarmesPath,
  tarefasPath,
  contadoresPath,
  cicloPath,
  mediaFotosPath,
  mediaAudiosPath,
  mediaVideosPath,
  mediaFrasesPath,
} from '@/lib/vault/paths';
import { stringifyCompanionMidia } from '@/lib/midia/companion';

import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { MarcoSchema, type Marco } from '@/lib/schemas/marco';
import { MedidasSchema, type Medida } from '@/lib/schemas/medidas';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';
import { TarefaSchema, type Tarefa } from '@/lib/schemas/tarefa';
import { ContadorSchema, type Contador } from '@/lib/schemas/contador';
import {
  CicloMenstrualSchema,
  type CicloMenstrualMeta,
} from '@/lib/schemas/ciclo_menstrual';

// Caracteres proibidos cross-OS em nome de arquivo. ':' e
// problematico no Obsidian Mac (separador de path historico).
// '/' e legitimo como separador de pasta dentro do path relativo,
// portanto e checado por basename, nao path inteiro.
const PROIBIDOS_BASENAME = /[<>:"|?*\\]/;

function tmpVault(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-audit-'));
  // Subpastas que os tests escrevem (subset relevante das 19 canonicas).
  const subs = [
    'daily',
    'eventos',
    'inbox/mente/diario',
    'marcos',
    'medidas',
    'treinos',
    'alarmes',
    'tarefas',
    'contadores',
    'inbox/saude/ciclo',
    'media/fotos',
    'media/audios',
    'media/videos',
    'media/frases',
  ];
  for (const sub of subs) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  return dir;
}

function escreverMd(vault: string, rel: string, meta: unknown, body: string) {
  const raw = stringifyFrontmatter(meta, body);
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, raw);
  return full;
}

function escreverBinario(vault: string, rel: string, conteudo: Buffer | string) {
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, conteudo);
  return full;
}

function lerYamlFrontmatter(file: string): unknown {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`sem frontmatter: ${file}`);
  // Modo 'strict': YAML.parse com strict disabled padrao; usamos
  // failsafe para detectar tags YAML invalidas (sai como erro).
  return YAML.parse(m[1], { strict: true });
}

function basenameSemExt(p: string): string {
  const base = path.basename(p);
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(0, dot) : base;
}

function checarCaracteres(rel: string) {
  for (const seg of rel.split('/')) {
    expect(seg).not.toMatch(PROIBIDOS_BASENAME);
  }
}

const DATA_FIXA = new Date('2026-05-04T15:00:00.000Z');

afterAll(() => {
  // Limpeza: tmpVault retorna paths sob os.tmpdir(); o sistema
  // limpa em boot. Preservar para inspecao manual nao quebra CI.
});

// ============================================================
// 1. HUMOR (M05) - daily/YYYY-MM-DD.md
// ============================================================
describe('feature humor (M05)', () => {
  it('grava daily/<data>.md com frontmatter zod-valido', () => {
    const vault = tmpVault();
    const meta: HumorMeta = {
      tipo: 'humor',
      data: '2026-05-04',
      autor: 'pessoa_a',
      humor: 4,
      energia: 3,
      ansiedade: 2,
      foco: 4,
      tags: [],
    };
    const rel = dailyPath(DATA_FIXA);
    expect(rel).toBe('daily/2026-05-04.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    expect(fs.existsSync(full)).toBe(true);
    const yaml = lerYamlFrontmatter(full);
    expect(yaml).toMatchObject({ tipo: 'humor', data: '2026-05-04' });

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, HumorSchema);
    expect(parsed.meta.humor).toBe(4);
  });
});

// ============================================================
// 2. DIARIO EMOCIONAL (M06) - inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md
//    + audio opcional em assets/ (legacy) ou media/audios/ (M34).
// ============================================================
describe('feature diario emocional (M06 + M06.5)', () => {
  it('grava inbox/mente/diario/<ts>-<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: DiarioEmocionalMeta = {
      tipo: 'diario_emocional',
      data: '2026-05-04T15:00:00-03:00',
      autor: 'pessoa_a',
      modo: 'trigger',
      emocoes: ['ansiedade'],
      intensidade: 3,
      com: [],
      contexto_social: [],
      texto: 'Texto livre do registro de hoje.',
      audio: null,
      midia: [],
      para: { tipo: 'mim' },
    };
    const rel = diarioEmocionalPath(DATA_FIXA, 'ansiedade');
    expect(rel).toMatch(
      /^inbox\/mente\/diario\/\d{4}-\d{2}-\d{2}-\d{4}-ansiedade\.md$/
    );
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, meta.texto);

    expect(fs.existsSync(full)).toBe(true);
    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, DiarioEmocionalSchema);
    expect(parsed.meta.modo).toBe('trigger');
    expect(parsed.body).toContain('Texto livre');
  });
});

// ============================================================
// 3. EVENTO (M07) - eventos/YYYY-MM-DD-slug.md
//    + fotos em assets/<prefixo>-evento-<idx>.jpg (legacy assets/).
// ============================================================
describe('feature evento (M07)', () => {
  it('grava eventos/<data>-<slug>.md com fotos referenciadas', () => {
    const vault = tmpVault();
    // Cria foto auxiliar no path legacy (assets/) que evento usa.
    fs.mkdirSync(path.join(vault, 'assets'), { recursive: true });
    const fotoRel = 'assets/2026-05-04-1500-evento-1.jpg';
    escreverBinario(vault, fotoRel, Buffer.from('fake jpg'));

    const meta: EventoMeta = {
      tipo: 'evento',
      data: '2026-05-04T15:00:00-03:00',
      autor: 'pessoa_a',
      modo: 'positivo',
      lugar: 'Café da esquina',
      bairro: 'Vila Madalena',
      com: [],
      categoria: 'casual',
      intensidade: 4,
      fotos: [fotoRel],
      // 'positivo' exige ao menos uma midia (refine no schema).
      // MidiaSchema (M07.x) usa discriminatedUnion com tipos
      // 'foto' / 'audio' / 'spotify' / 'youtube' e campo path.
      midia: [
        {
          tipo: 'foto',
          path: fotoRel,
        },
      ],
      para: { tipo: 'mim' },
    };
    const rel = eventosPath(DATA_FIXA, 'cafe-bom');
    expect(rel).toBe('eventos/2026-05-04-cafe-bom.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');
    expect(fs.existsSync(full)).toBe(true);
    expect(fs.existsSync(path.join(vault, fotoRel))).toBe(true);

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, EventoSchema);
    expect(parsed.meta.modo).toBe('positivo');
    expect(parsed.meta.fotos).toContain(fotoRel);
  });
});

// ============================================================
// 4. CONTADOR (M18) - contadores/<slug>.md
// ============================================================
describe('feature contador (M18)', () => {
  it('grava contadores/<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: Contador = {
      tipo: 'contador',
      slug: 'sem-acucar',
      titulo: 'Sem açúcar',
      inicio: '2026-05-01',
      recorde: 3,
      resets: ['2026-05-04T15:00:00-03:00'],
      criado_em: '2026-05-04T15:00:00-03:00',
      para: { tipo: 'mim' },
    };
    const rel = contadoresPath(meta.slug);
    expect(rel).toBe('contadores/sem-acucar.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, ContadorSchema);
    expect(parsed.meta.recorde).toBe(3);
    expect(parsed.meta.titulo).toContain('açúcar');
  });
});

// ============================================================
// 5. TAREFA (M17 + M31) - tarefas/YYYY-MM-DD-<slug>.md
// ============================================================
describe('feature tarefa (M17 + M31)', () => {
  it('grava tarefas/<data>-<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: Tarefa = {
      tipo: 'tarefa',
      data: '2026-05-04',
      autor: 'pessoa_a',
      titulo: 'Comprar pão',
      feito: false,
      feito_em: null,
      categoria: 'casa',
      pessoa_destino: { tipo: 'mim' },
      alarme: null,
    };
    const rel = tarefasPath(DATA_FIXA, 'comprar-pao-7k2x');
    expect(rel).toBe('tarefas/2026-05-04-comprar-pao-7k2x.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, TarefaSchema);
    expect(parsed.meta.feito).toBe(false);
    expect(parsed.meta.titulo).toContain('pão');
  });
});

// ============================================================
// 6. MEDIDAS (M12) - medidas/YYYY-MM-DD.md
// ============================================================
describe('feature medidas corporais (M12)', () => {
  it('grava markdown/medidas-<data>.md zod-valido (H2 layout-por-tipo)', () => {
    const vault = tmpVault();
    const meta: Medida = {
      tipo: 'medidas',
      data: '2026-05-04',
      autor: 'pessoa_a',
      peso: 70.5,
      cintura: 82,
      fotos: [],
    };
    const rel = medidasPath(DATA_FIXA);
    expect(rel).toBe('markdown/medidas-2026-05-04.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, MedidasSchema);
    expect(parsed.meta.peso).toBe(70.5);
  });
});

// ============================================================
// 7. MARCO (M11) - marcos/YYYY-MM-DD-<slug>.md
// ============================================================
describe('feature marco (M11)', () => {
  it('grava marcos/<data>-<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: Marco = {
      tipo: 'marco',
      data: '2026-05-04T15:00:00-03:00',
      autor: 'pessoa_a',
      descricao: 'Primeira corrida de 5km',
      tags: ['corrida'],
      auto: false,
      para: { tipo: 'mim' },
    };
    const rel = marcosPath(DATA_FIXA, 'primeira-corrida');
    expect(rel).toBe('marcos/2026-05-04-primeira-corrida.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, MarcoSchema);
    expect(parsed.meta.descricao).toContain('corrida');
  });
});

// ============================================================
// 8. TREINO (M11) - treinos/YYYY-MM-DD-<slug>.md
// ============================================================
describe('feature treino sessao (M11)', () => {
  it('grava treinos/<data>-<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: TreinoSessao = {
      tipo: 'treino_sessao',
      data: '2026-05-04T15:00:00-03:00',
      autor: 'pessoa_a',
      rotina: 'rotina A',
      duracao_min: 45,
      exercicios: [
        { nome: 'Agachamento', series: 3, reps: 12, carga_kg: 40 },
      ],
    };
    const rel = treinosPath(DATA_FIXA, 'rotina-a');
    expect(rel).toBe('treinos/2026-05-04-rotina-a.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, TreinoSessaoSchema);
    expect(parsed.meta.duracao_min).toBe(45);
    expect(parsed.meta.exercicios).toHaveLength(1);
  });
});

// ============================================================
// 9. ALARME (M16) - alarmes/<slug>.md
// ============================================================
describe('feature alarme (M16)', () => {
  it('grava alarmes/<slug>.md zod-valido', () => {
    const vault = tmpVault();
    const meta: Alarme = {
      tipo: 'alarme',
      slug: 'remedio-manha',
      titulo: 'Remédio da manhã',
      horario: '08:00',
      dias_semana: [1, 2, 3, 4, 5],
      recorrencia: 'semanal',
      // data_unica: omitido (optional, so requerido em recorrencia 'unica').
      tag: 'medicacao',
      som: 'gentle',
      ativo: true,
      snooze_minutos: 5,
      criado_em: '2026-05-04T15:00:00-03:00',
      ultimo_disparo: null,
      notification_ids: [],
      snooze_id: null,
    };
    const rel = alarmesPath(meta.slug);
    expect(rel).toBe('alarmes/remedio-manha.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, AlarmeSchema);
    expect(parsed.meta.horario).toBe('08:00');
    expect(parsed.meta.titulo).toContain('Remédio');
  });
});

// ============================================================
// 10. CICLO MENSTRUAL (M14.5) - inbox/saude/ciclo/YYYY-MM-DD.md
// ============================================================
describe('feature ciclo menstrual (M14.5)', () => {
  it('grava markdown/ciclo-<data>.md zod-valido (H2 layout-por-tipo)', () => {
    const vault = tmpVault();
    const meta: CicloMenstrualMeta = {
      tipo: 'ciclo_menstrual',
      data: '2026-05-04',
      autor: 'pessoa_a',
      data_inicio: '2026-05-01',
      fase: 'menstrual',
      sintomas: ['colica'],
      intensidade: 3,
      humor_associado: null,
      texto: null,
    };
    const rel = cicloPath(DATA_FIXA);
    expect(rel).toBe('markdown/ciclo-2026-05-04.md');
    checarCaracteres(rel);
    const full = escreverMd(vault, rel, meta, '');

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = parseFrontmatter(raw, CicloMenstrualSchema);
    expect(parsed.meta.fase).toBe('menstrual');
  });
});

// ============================================================
// 11. FRASE (M34) - media/frases/YYYY-MM-DD-<slug>.md
//     Frase nao tem binario; o .md guarda texto + companion.
// ============================================================
describe('feature frase (M34)', () => {
  it('grava media/frases/<data>-<slug>.md com companion content', () => {
    const vault = tmpVault();
    const rel = mediaFrasesPath(DATA_FIXA, 'caminho-cresce');
    expect(rel).toBe('media/frases/2026-05-04-caminho-cresce.md');
    checarCaracteres(rel);
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_frase',
      arquivo: '2026-05-04-caminho-cresce.md',
      data: '2026-05-04T15:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      legenda: 'O caminho cresce sob os pés de quem caminha.',
    });
    const full = path.join(vault, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, conteudo);

    expect(fs.existsSync(full)).toBe(true);
    const yaml = lerYamlFrontmatter(full);
    expect(yaml).toMatchObject({ tipo: 'midia_frase' });
    // Body deve conter o texto da frase para legibilidade no Obsidian.
    const raw = fs.readFileSync(full, 'utf8');
    expect(raw).toContain('O caminho cresce');
  });
});

// ============================================================
// 12. FOTO (M34) - media/fotos/YYYY-MM-DD-<rand>.jpg + companion .md
// ============================================================
describe('feature foto (M34)', () => {
  it('grava media/fotos/<data>-<rand>.jpg + companion .md 1:1', () => {
    const vault = tmpVault();
    const relBin = mediaFotosPath(DATA_FIXA, 'a1b2');
    expect(relBin).toBe('media/fotos/2026-05-04-a1b2.jpg');
    const relCompanion = relBin.replace(/\.jpg$/i, '.md');
    expect(relCompanion).toBe('media/fotos/2026-05-04-a1b2.md');
    checarCaracteres(relBin);
    checarCaracteres(relCompanion);

    escreverBinario(vault, relBin, Buffer.from('fake jpg bytes'));
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_foto',
      arquivo: '2026-05-04-a1b2.jpg',
      data: '2026-05-04T15:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      legenda: 'Fim de tarde no parque',
    });
    fs.writeFileSync(path.join(vault, relCompanion), conteudo);

    expect(fs.existsSync(path.join(vault, relBin))).toBe(true);
    expect(fs.existsSync(path.join(vault, relCompanion))).toBe(true);
    // Mesma pasta, mesmo basename: 1:1.
    expect(basenameSemExt(relBin)).toBe(basenameSemExt(relCompanion));
    expect(path.dirname(relBin)).toBe(path.dirname(relCompanion));

    const yaml = lerYamlFrontmatter(path.join(vault, relCompanion));
    expect(yaml).toMatchObject({
      tipo: 'midia_foto',
      arquivo: '2026-05-04-a1b2.jpg',
    });
  });
});

// ============================================================
// 13. VIDEO (M34) - media/videos/YYYY-MM-DD-<rand>.mp4 + companion
// ============================================================
describe('feature video (M34)', () => {
  it('grava media/videos/<data>-<rand>.mp4 + companion .md 1:1', () => {
    const vault = tmpVault();
    const relBin = mediaVideosPath(DATA_FIXA, 'c3d4');
    expect(relBin).toBe('media/videos/2026-05-04-c3d4.mp4');
    const relCompanion = relBin.replace(/\.mp4$/i, '.md');
    checarCaracteres(relBin);
    checarCaracteres(relCompanion);

    escreverBinario(vault, relBin, Buffer.from('fake mp4 bytes'));
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_video',
      arquivo: '2026-05-04-c3d4.mp4',
      data: '2026-05-04T15:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
    });
    fs.writeFileSync(path.join(vault, relCompanion), conteudo);

    expect(fs.existsSync(path.join(vault, relBin))).toBe(true);
    expect(fs.existsSync(path.join(vault, relCompanion))).toBe(true);
    expect(basenameSemExt(relBin)).toBe(basenameSemExt(relCompanion));
    const yaml = lerYamlFrontmatter(path.join(vault, relCompanion));
    expect(yaml).toMatchObject({ tipo: 'midia_video' });
  });
});

// ============================================================
// 14. AUDIO (M34, capturarMusica) - media/audios/<...>.<ext> + companion
// ============================================================
describe('feature audio - captura unificada (M34)', () => {
  it('grava media/audios/<data>-<rand>.m4a + companion .md 1:1', () => {
    const vault = tmpVault();
    const relCanon = mediaAudiosPath(DATA_FIXA, 'e5f6');
    expect(relCanon).toBe('media/audios/2026-05-04-e5f6.m4a');
    const relBin = relCanon; // capturarMusica preserva extensao original.
    const relCompanion = relBin.replace(/\.[a-z0-9]+$/i, '.md');
    expect(relCompanion).toBe('media/audios/2026-05-04-e5f6.md');
    checarCaracteres(relBin);
    checarCaracteres(relCompanion);

    escreverBinario(vault, relBin, Buffer.from('fake m4a bytes'));
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_audio',
      arquivo: '2026-05-04-e5f6.m4a',
      data: '2026-05-04T15:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      legenda: 'Música favorita do dia',
    });
    fs.writeFileSync(path.join(vault, relCompanion), conteudo);

    expect(fs.existsSync(path.join(vault, relBin))).toBe(true);
    expect(fs.existsSync(path.join(vault, relCompanion))).toBe(true);
    expect(basenameSemExt(relBin)).toBe(basenameSemExt(relCompanion));
    const yaml = lerYamlFrontmatter(path.join(vault, relCompanion));
    expect(yaml).toMatchObject({ tipo: 'midia_audio' });
  });
});
