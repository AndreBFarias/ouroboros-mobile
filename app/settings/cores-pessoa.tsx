// Sub-tela /settings/cores-pessoa (P7, 2026-09-08): a pessoa troca a
// cor que identifica cada identidade no aplicativo.
//
// SOBRE O TEXTO E O DESENHO DESTA TELA
//
// O eixo de acessibilidade do projeto e' CONTROLE, nao conformidade: o
// defeito e' o aplicativo decidir sozinho algo que deveria ser escolha.
// Ate 2026-09-08 as cores de pessoa eram Regra Inviolavel -- so' mudavam
// recompilando o aplicativo --, e para quem e' sensivel a estimulo
// visual isso e' o aplicativo escolhendo por conta propria.
//
// A troca, porem, e' medida. A cor de pessoa carrega informacao (de
// quem e' aquele registro), e uma cor que some no fundo escuro nao
// deixa a interface "mais discreta", deixa a informacao inacessivel.
// Por isso a tela RECUSA cor que reprove no contraste -- e, ao recusar,
// diz a razao obtida, a razao minima e o que ficaria dificil de ler.
// Nada de "cor invalida": nao ha erro de quem escolheu, ha uma medida
// que nao fecha, e ela e' mostrada por inteiro para que a proxima
// tentativa seja informada.
//
// Comentarios sem acento (convencao shell/CI). Strings de UI em PT-BR
// sentence case com acentuacao completa. accessibilityLabel sem acento.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Header,
  Input,
  PersonAvatar,
  Screen,
  useToast,
} from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { Check } from '@/lib/icons';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useNomeDe } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';
import { temSegundaPessoa } from '@/lib/schemas/companhia';
import {
  useCoresPessoa,
  useCorPessoa,
  CORES_PESSOA_DEFAULT,
  CORES_SUGERIDAS,
} from '@/lib/stores/coresPessoa';
import {
  mensagemRecusaCorPessoa,
  type AvaliacaoCorPessoa,
} from '@/lib/a11y/corPessoa';
import { atualizarWidgetHomescreen } from '@/lib/widget/atualizarWidgetHomescreen';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Lado do atalho de cor. 44dp e' o piso de area de toque do projeto
// (minHitArea em theme/tokens); 44 desenhados dispensam hitSlop e
// mantem a conta visivel no proprio style.
const LADO_ATALHO = 44;

interface BlocoCorProps {
  pessoa: PessoaAutor;
}

function BlocoCor({ pessoa }: BlocoCorProps) {
  const toast = useToast();
  const nome = useNomeDe(pessoa);
  const corAtual = useCorPessoa(pessoa);
  const definirCor = useCoresPessoa((s) => s.definirCor);
  const restaurarPadrao = useCoresPessoa((s) => s.restaurarPadrao);
  // Rascunho local: comeca na cor em vigor, para a pessoa ajustar a
  // partir do que ja ve, em vez de digitar do zero.
  const [rascunho, setRascunho] = useState<string>(corAtual);
  const [recusa, setRecusa] = useState<AvaliacaoCorPessoa | null>(null);

  const ehPadrao = corAtual === CORES_PESSOA_DEFAULT[pessoa];

  // Uma unica porta de escrita para os dois caminhos (atalho e campo):
  // se o atalho pulasse a medida, a promessa de recusar cor ilegivel
  // valeria so' para metade da tela.
  const aplicar = useCallback(
    (valor: string) => {
      const avaliacao = definirCor(pessoa, valor);
      if (!avaliacao.ok) {
        setRecusa(avaliacao);
        void haptics.light();
        return;
      }
      setRecusa(null);
      setRascunho(avaliacao.cor ?? valor);
      void haptics.success();
      toast.show('Cor trocada.', 'success');
      // O widget da tela inicial guarda a cor no payload nativo e nao
      // observa o store; sem este empurrao ele so' repintaria no
      // proximo registro de humor.
      void atualizarWidgetHomescreen({ forcar: true });
    },
    [definirCor, pessoa, toast]
  );

  const voltarAoPadrao = useCallback(() => {
    restaurarPadrao(pessoa);
    setRascunho(CORES_PESSOA_DEFAULT[pessoa]);
    setRecusa(null);
    void haptics.light();
    toast.show('Cor de volta ao padrão.', 'info');
    void atualizarWidgetHomescreen({ forcar: true });
  }, [restaurarPadrao, pessoa, toast]);

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        borderLeftWidth: 3,
        borderLeftColor: corAtual,
        padding: spacing.base,
        gap: spacing.sm,
      }}
      accessibilityLabel={`bloco cor ${pessoa}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <PersonAvatar pessoa={pessoa} size="lg" />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: corAtual,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.heading2.size,
              lineHeight:
                typography.heading2.size * typography.heading2.lineHeight,
            }}
          >
            {nome}
          </Text>
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.micro.size,
              lineHeight: typography.micro.size * typography.micro.lineHeight,
            }}
            accessibilityLabel={`cor em vigor ${pessoa} ${corAtual}`}
          >
            {ehPadrao
              ? `${corAtual} — cor de partida`
              : `${corAtual} — escolhida por você`}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        Toque em uma cor sugerida ou escreva o código de outra.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
        }}
      >
        {CORES_SUGERIDAS.map((sugerida) => {
          const selecionada = sugerida.hex === corAtual;
          return (
            <Pressable
              key={sugerida.hex}
              onPress={() => aplicar(sugerida.hex)}
              accessibilityRole="button"
              accessibilityLabel={`cor ${sugerida.nome.toLowerCase()} para ${pessoa}`}
              accessibilityState={{ selected: selecionada }}
              style={{
                width: LADO_ATALHO,
                height: LADO_ATALHO,
                borderRadius: LADO_ATALHO / 2,
                backgroundColor: sugerida.hex,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selecionada ? 2 : 0,
                borderColor: colors.fg,
              }}
            >
              {selecionada ? (
                <Check size={20} color={colors.bg} strokeWidth={2} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Input
        value={rascunho}
        onChangeText={(proximo) => {
          setRascunho(proximo);
          setRecusa(null);
        }}
        label="Código da cor"
        placeholder="#bd93f9"
        autoCapitalize="none"
        maxLength={7}
        accessibilityLabel={`campo cor ${pessoa}`}
      />

      {recusa ? (
        <Text
          style={{
            color: colors.yellow,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
          accessibilityLabel={`aviso cor ${pessoa}`}
        >
          {mensagemRecusaCorPessoa(recusa)}
        </Text>
      ) : null}

      {/* Coluna, e nao linha: o `Button` primario nao tem padding
          horizontal por desenho (W1.1 em Button.tsx), entao dentro de
          uma linha o rotulo longo encosta na borda e a ultima letra
          fica cortada -- foi o que a primeira captura desta sprint
          mostrou. Em largura cheia o texto centraliza e sobra folga. */}
      <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
        <Button
          label="Usar esta cor" // ptbr-allow: 'esta' pronome demonstrativo (esta cor), nao verbo
          fullWidth
          onPress={() => aplicar(rascunho)}
          accessibilityLabel={`usar cor ${pessoa}`}
        />
        {ehPadrao ? null : (
          <Button
            label="Voltar ao padrão"
            variant="ghost"
            fullWidth
            onPress={voltarAoPadrao}
            accessibilityLabel={`voltar cor padrao ${pessoa}`}
          />
        )}
      </View>
    </View>
  );
}

export default function CoresPessoaTela() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
  const tipoCompanhia = useSettings((s) => s.pessoa.tipoCompanhia);
  const ehDuo = temSegundaPessoa(tipoCompanhia);

  return (
    <Screen>
      <Header title="Cores das pessoas" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: paddingBottomFab,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="tela cores das pessoas"
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          A cor identifica de quem é cada registro: aparece no avatar, no nome e
          nas bordas que separam uma pessoa da outra. O aplicativo começa com
          uma cor para cada pessoa, e essa escolha é sua.
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          Como o fundo do aplicativo é escuro, algumas cores ficam difíceis de
          enxergar nele. Quando isso acontece, a troca não é guardada e o aviso
          mostra o quanto faltou. O resto do aplicativo continua igual: só muda
          a cor de quem assina cada registro.
        </Text>

        <BlocoCor pessoa="pessoa_a" />
        {ehDuo ? <BlocoCor pessoa="pessoa_b" /> : null}

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: typography.micro.size * typography.micro.lineHeight,
          }}
        >
          A escolha fica neste aparelho, no armazenamento protegido do sistema.
          Não vai para o Vault e não muda os registros já gravados.
        </Text>
      </ScrollView>
    </Screen>
  );
}
