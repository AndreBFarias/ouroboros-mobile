// Tela de criacao de Rotina (Q11.a + R-ROT-2). Reusa FormRotina e
// orquestra: slugifica o nome, garante unicidade do slug com sufixo
// random quando colide, monta RotinaMeta e persiste via escreverRotina.
//
// R-ROT-2: Rotina deixou de ser "so treino". Categoria amplia a
// semantica para medicacao, habito, leitura, etc. Esta tela exibe:
//  1. Templates pre-preenchidos visiveis no topo ("Tomar remedio",
//     "Tomar agua", "Caminhar 30min") para baixar a barreira de
//     entrada de quem nao quer um treino completo.
//  2. Chips de categoria como primeiro campo (acima de Nome), nao
//     enterrados em accordion. Cada chip seta a categoria que vira
//     com a rotina no frontmatter.
//
// Pos-Salvar: toast "Rotina criada." + router.replace para o detalhe
// (/rotinas/<slug>) -- permite edicao imediata como o spec pede.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Screen, useToast } from '@/components/ui';
import {
  FormRotina,
  type FormRotinaInicial,
  type FormRotinaSubmit,
} from '@/components/treino/FormRotina';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { escreverRotina, listarRotinas } from '@/lib/vault/rotina';
import { slugifyTitulo, sufixoRandom } from '@/lib/schemas/tarefa';
import {
  ROTINA_CATEGORIAS,
  ROTINA_CATEGORIA_LABELS,
  RotinaSchema,
  type ExercicioRotina,
  type RotinaCategoria,
  type RotinaMeta,
} from '@/lib/schemas/rotina';
import { formatDateYmd } from '@/lib/vault/paths';
import { comTimeout } from '@/lib/util/comTimeout';
import { colors, spacing } from '@/theme/tokens';

// Garante slug unico contra rotinas existentes do mesmo autor.
// Adiciona sufixo random quando colide; loop limitado a 50 tentativas.
async function resolverSlugUnico(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b',
  base: string
): Promise<string | null> {
  const existentes = await listarRotinas(vaultRoot, autor);
  const usados = new Set(existentes.map((r) => r.slug));
  if (!usados.has(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidato = `${base}-${sufixoRandom()}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

// R-ROT-2: templates pre-preenchidos. Cada template define nome,
// descricao, categoria e um exercicio inicial generico (o schema exige
// pelo menos 1 item em exercicios; para rotinas nao-exercicio ele atua
// como "passo" ou "dose"). Usuario pode editar tudo apos selecionar.
interface TemplateRotina {
  id: string;
  label: string;
  nome: string;
  descricao: string;
  categoria: RotinaCategoria;
  exercicios: ExercicioRotina[];
}

const TEMPLATES: readonly TemplateRotina[] = [
  {
    id: 'tomar-remedio',
    label: 'Tomar remédio',
    nome: 'Tomar remédio',
    descricao: 'Lembrete diário de medicação.',
    categoria: 'medicacao',
    exercicios: [
      {
        nome: '1 comprimido',
        carga_kg: null,
        series: 1,
        reps: '1',
        descanso_seg: 60,
        observacao: null,
      },
    ],
  },
  {
    id: 'tomar-agua',
    label: 'Tomar água',
    nome: 'Tomar água',
    descricao: 'Hidratação ao longo do dia.',
    categoria: 'habito',
    exercicios: [
      {
        nome: 'Copo de água',
        carga_kg: null,
        series: 1,
        reps: '1',
        descanso_seg: 60,
        observacao: null,
      },
    ],
  },
  {
    id: 'caminhar-30min',
    label: 'Caminhar 30min',
    nome: 'Caminhada',
    descricao: 'Caminhada leve de 30 minutos.',
    categoria: 'saude_fisica',
    exercicios: [
      {
        nome: 'Caminhada',
        carga_kg: null,
        series: 1,
        reps: '30min',
        descanso_seg: 60,
        observacao: null,
      },
    ],
  },
] as const;

// Chip individual de categoria. Selecionado: fundo purple + texto bg.
// Nao selecionado: fundo bgAlt + texto fg + borda bgElev.
interface ChipCategoriaProps {
  categoria: RotinaCategoria;
  selecionado: boolean;
  onPress: () => void;
}

function ChipCategoria({
  categoria,
  selecionado,
  onPress,
}: ChipCategoriaProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`categoria ${categoria}`}
      style={{
        backgroundColor: selecionado ? colors.purple : colors.bgAlt,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selecionado ? colors.purple : colors.bgElev,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.xs,
        minHeight: 36,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: selecionado ? colors.bg : colors.fg,
          fontFamily: selecionado
            ? 'JetBrainsMono_500Medium'
            : 'JetBrainsMono_400Regular',
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {ROTINA_CATEGORIA_LABELS[categoria]}
      </Text>
    </Pressable>
  );
}

// Pill de template pre-preenchido. Tap aplica os dados ao form.
interface TemplateBotaoProps {
  template: TemplateRotina;
  onPress: () => void;
}

function TemplateBotao({ template, onPress }: TemplateBotaoProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`template ${template.id}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.bgElev,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        minHeight: 40,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {template.label}
      </Text>
    </Pressable>
  );
}

export default function RotinasNovo() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const toast = useToast();
  const [salvando, setSalvando] = useState<boolean>(false);

  // R-ROT-2: categoria default 'outro' alinhada ao schema. Usuario
  // pode trocar via chips ANTES de salvar, ou via template (que seta
  // a categoria correspondente).
  const [categoria, setCategoria] = useState<RotinaCategoria>('outro');

  // R-ROT-2: dados iniciais do form sao reapresentados ao FormRotina
  // quando o usuario aplica um template. Comeca undefined (form puro).
  const [inicial, setInicial] = useState<FormRotinaInicial | undefined>(
    undefined
  );

  // R-ROT-2: trocar key remonta FormRotina para refletir `inicial` novo.
  // Sem isso o useState interno do FormRotina ignora props apos mount.
  const [formKey, setFormKey] = useState<number>(0);

  const aplicarTemplate = useCallback((template: TemplateRotina) => {
    void haptics.light();
    setCategoria(template.categoria);
    setInicial({
      nome: template.nome,
      descricao: template.descricao,
      exercicios: template.exercicios,
    });
    setFormKey((k) => k + 1);
  }, []);

  const selecionarCategoria = useCallback((cat: RotinaCategoria) => {
    void haptics.selection();
    setCategoria(cat);
  }, []);

  const handleSubmit = useCallback(
    async (dados: FormRotinaSubmit) => {
      if (!vaultRoot || salvando) return;
      setSalvando(true);
      try {
        const base = slugifyTitulo(dados.nome);
        if (base.length === 0 || base === 'tarefa') {
          // slugifyTitulo retorna 'tarefa' como fallback quando o titulo
          // so tinha simbolos -- inadequado para rotina. Reusamos o
          // helper porque ele cuida de acentos/case/comprimento, mas
          // bloqueamos esse fallback explicitamente.
          toast.show('Nome inválido para slug.', 'error');
          return;
        }
        const slug = await comTimeout(
          resolverSlugUnico(vaultRoot, pessoaAtiva, base)
        );
        if (!slug) {
          toast.show('Não foi possível salvar: slug em uso.', 'error');
          return;
        }

        const proposto: RotinaMeta = {
          tipo: 'rotina_treino',
          slug,
          nome: dados.nome,
          descricao: dados.descricao,
          exercicios: dados.exercicios,
          data_criacao: formatDateYmd(new Date()),
          autor: pessoaAtiva,
          categoria,
        };

        const parsed = RotinaSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }

        await comTimeout(escreverRotina(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Rotina criada.', 'success');
        router.replace({
          pathname: '/rotinas/[slug]',
          params: { slug },
        });
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, pessoaAtiva, salvando, toast, router, categoria]
  );

  const categoriasOrdenadas = useMemo(() => [...ROTINA_CATEGORIAS], []);

  return (
    <Screen>
      <Header title="Nova rotina" onBack={() => router.back()} />

      <View
        style={{ paddingTop: spacing.sm, gap: spacing.lg }}
        accessibilityLabel="prefacio rotina nova"
      >
        <View
          style={{ gap: spacing.sm }}
          accessibilityLabel="templates pre preenchidos"
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Começar com um modelo
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            {TEMPLATES.map((t) => (
              <TemplateBotao
                key={t.id}
                template={t}
                onPress={() => aplicarTemplate(t)}
              />
            ))}
          </View>
        </View>

        <View
          style={{ gap: spacing.sm }}
          accessibilityLabel="chips de categoria"
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Categoria
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            {categoriasOrdenadas.map((cat) => (
              <ChipCategoria
                key={cat}
                categoria={cat}
                selecionado={categoria === cat}
                onPress={() => selecionarCategoria(cat)}
              />
            ))}
          </View>
        </View>
      </View>

      <FormRotina
        key={formKey}
        inicial={inicial}
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        rotuloSalvar="Salvar"
        salvando={salvando}
      />
    </Screen>
  );
}
