// Unit dos montadores puros do seed opcional de onboarding (R-HOME-4e).
// Nao renderiza RN: importa apenas as funcoes puras montarHumorSeed /
// montarTarefaSeed do arquivo do componente e valida o payload contra
// os schemas canonicos (HumorSchema / TarefaSchema).
//
// Comentarios sem acento (convencao shell/CI).
import {
  montarHumorSeed,
  montarTarefaSeed,
} from '@/components/onboarding/SeedOpcionalOnboarding';
import { HumorSchema } from '@/lib/schemas/humor';
import { TarefaSchema } from '@/lib/schemas/tarefa';

describe('montarHumorSeed', () => {
  it('slider humor=4 + frase produz HumorMeta valido com defaults neutros', () => {
    const meta = montarHumorSeed('pessoa_a', 4, 'tarde leve');
    const parsed = HumorSchema.safeParse(meta);

    expect(parsed.success).toBe(true);
    expect(meta.humor).toBe(4);
    expect(meta.energia).toBe(3);
    expect(meta.ansiedade).toBe(3);
    expect(meta.foco).toBe(3);
    expect(meta.autor).toBe('pessoa_a');
    expect(meta.tipo).toBe('humor');
    expect(meta.frase).toBe('tarde leve');
    expect(meta.tags).toEqual([]);
    expect(meta.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('frase vazia (ou so espacos) nao entra no payload', () => {
    const meta = montarHumorSeed('pessoa_b', 2, '   ');
    const parsed = HumorSchema.safeParse(meta);

    expect(parsed.success).toBe(true);
    expect(meta.autor).toBe('pessoa_b');
    expect(meta.humor).toBe(2);
    expect('frase' in meta).toBe(false);
  });

  it('preserva acentuacao da frase (trim sem alterar conteudo)', () => {
    const meta = montarHumorSeed('pessoa_a', 5, '  dia radiante  ');
    expect(meta.frase).toBe('dia radiante');
  });
});

describe('montarTarefaSeed', () => {
  it('titulo simples produz Tarefa valida com categoria outro e destino mim', () => {
    const { meta, slug } = montarTarefaSeed('pessoa_a', 'Comprar pão');
    const parsed = TarefaSchema.safeParse(meta);

    expect(parsed.success).toBe(true);
    expect(meta.tipo).toBe('tarefa');
    expect(meta.titulo).toBe('Comprar pão');
    expect(meta.categoria).toBe('outro');
    expect(meta.pessoa_destino.tipo).toBe('mim');
    expect(meta.feito).toBe(false);
    expect(meta.feito_em).toBeNull();
    expect(meta.alarme).toBeNull();
    expect(meta.silenciar_sugestao_ate).toBeNull();
    expect(meta.autor).toBe('pessoa_a');
    expect(meta.data).toMatch(/^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  });

  it('slug deriva do titulo (acentos removidos) + sufixo random de 4 chars', () => {
    const { slug } = montarTarefaSeed('pessoa_a', 'Comprar pão');
    expect(slug).toMatch(/^comprar-pao-[a-z0-9]{4}$/);
  });

  it('autor pessoa_b e propagado', () => {
    const { meta } = montarTarefaSeed('pessoa_b', 'Regar plantas');
    expect(meta.autor).toBe('pessoa_b');
  });
});
