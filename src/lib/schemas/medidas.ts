// Schema do arquivo medidas/YYYY-MM-DD.md (medidas corporais semanais).
// Modelado em docs/BRIEFING.md seção 7 e docs/sprints/M12-spec.md.
//
// Cada arquivo representa um snapshot de medidas em uma data; as 9
// medidas são todas opcionais (usuario pode pular campos sem dado),
// mas precisa haver pelo menos uma medida ou foto para o registro
// fazer sentido. Fotos como array de paths relativos ao Vault (3
// posicoes canonicas: frente, costas, lado) - estrutura aberta para
// permitir variacao no futuro. Reflexao em texto livre opcional.
//
// Convencoes do projeto:
//  - autor sempre 'pessoa_a' ou 'pessoa_b' (nunca 'ambos').
//  - Sem cores positivas/negativas no delta (ADR-0005); a Tela 13
//    consome apenas valor absoluto sem tonalizar ganho/perda.
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Data YYYY-MM-DD (sem hora; medidas são um snapshot diario, não um
// evento timestamp). Mesmo padrao usado por daily/<...>.md (humor).
const DataYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

// Medida individual em centimetros ou kg. Número positivo finito.
// Limite superior defensivo (peso 500kg / 500cm) para detectar erros
// de digitacao tipo "780" ao inves de "78,0". Limite inferior 0
// permite registros parciais (zero apenas em campos onde caller não
// preencheu, mas o schema deixa o campo opcional - quem quiser
// "zero literal" precisa fazer escolha explicita).
const MedidaNumerica = z.number().positive().finite().max(500);

// Percentual 0..100 (campo gordura corporal). Faixa distinta do
// MedidaNumerica porque a unidade e' adimensional e o limite max e'
// 100 (acima disso e' lixo). Q17.c.d (2026-05-13).
const MedidaPercentual = z.number().nonnegative().finite().max(100);

export const MedidasSchema = z.object({
  tipo: z.literal('medidas'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  // Nove medidas canonicas conforme docs/BRIEFING.md seção 7
  // mais "gordura" (% body fat) adicionada em Q17.c.d para fechar
  // o trio HC write (peso + body fat + menstruacao).
  // Todas opcionais: usuario registra so o que quer naquela semana.
  peso: MedidaNumerica.optional(),
  gordura: MedidaPercentual.optional(),
  cintura: MedidaNumerica.optional(),
  peito: MedidaNumerica.optional(),
  braco_esq: MedidaNumerica.optional(),
  braco_dir: MedidaNumerica.optional(),
  coxa_esq: MedidaNumerica.optional(),
  coxa_dir: MedidaNumerica.optional(),
  barriga: MedidaNumerica.optional(),
  quadril: MedidaNumerica.optional(),
  // Paths relativos ao Vault (ex: 'assets/m-2026-04-28-frente.jpg').
  // Default vazio para permitir registro so com números (ou so foto).
  fotos: z.array(z.string()).default([]),
  // Texto livre opcional. Tela 12 expoe 3 textareas (sentindo,
  // objetivos, observacoes) que o caller pode concatenar em um unico
  // campo via separador definido pela UI.
  reflexao: z.string().optional(),
});

export type Medida = z.infer<typeof MedidasSchema>;

// Ordem canonica dos campos numericos para iteracao consistente em
// componentes (form 2 colunas, grid de cards). Caller pode renderizar
// com .map(MEDIDAS_CAMPOS) garantindo ordem estavel.
export const MEDIDAS_CAMPOS = [
  'peso',
  'gordura',
  'cintura',
  'peito',
  'braco_esq',
  'braco_dir',
  'coxa_esq',
  'coxa_dir',
  'barriga',
  'quadril',
] as const satisfies ReadonlyArray<keyof Medida>;

export type MedidaCampo = (typeof MEDIDAS_CAMPOS)[number];

// Metadata de exibicao por campo: rotulo PT-BR, unidade. Mantida
// próxima do schema para evitar drift entre tela e modelo.
export const MEDIDAS_LABELS: Record<
  MedidaCampo,
  { label: string; unidade: 'kg' | 'cm' | '%' }
> = {
  peso: { label: 'Peso', unidade: 'kg' },
  gordura: { label: 'Gordura corporal', unidade: '%' },
  cintura: { label: 'Cintura', unidade: 'cm' },
  peito: { label: 'Peito', unidade: 'cm' },
  braco_esq: { label: 'Braço esquerdo', unidade: 'cm' },
  braco_dir: { label: 'Braço direito', unidade: 'cm' },
  coxa_esq: { label: 'Coxa esquerda', unidade: 'cm' },
  coxa_dir: { label: 'Coxa direita', unidade: 'cm' },
  barriga: { label: 'Barriga', unidade: 'cm' },
  quadril: { label: 'Quadril', unidade: 'cm' },
};
