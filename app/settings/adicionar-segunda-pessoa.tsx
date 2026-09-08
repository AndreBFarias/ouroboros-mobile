// Sub-tela: adicionar pessoa B quando tipoCompanhia atual e 'sozinho'.
// Replica o Frame 1 do onboarding (M03): escolha casal/amigos,
// AvatarPicker + Input do nome. Ao salvar, chama
// useOnboarding.setTipoCompanhia (que espelha em useSettings) e
// setNome de pessoa B. Avisa o usuario que a pessoa A continua a mesma.
//
// Decisão M15: o link aparece em /settings/index apenas se
// tipoCompanhia === 'sozinho'. Após salvar aqui, some automaticamente
// da Tela 23.
//
// P3 (2026-09-08): a tela escrevia direto em useSettings o literal
// 'duo', sem tocar useOnboarding -- e o BootHook
// reconciliarTipoCompanhiaHook, que copia onboarding -> settings,
// desfazia a adição no boot seguinte. Agora a escolha entra pelo store
// canônico, e a pergunta "casal ou amigos" é feita aqui como no
// onboarding, em vez de presumida.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AvatarPicker,
  Button,
  ChipGroup,
  Header,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, spacing, typography } from '@/theme/tokens';

export default function AdicionarSegundaPessoa() {
  const router = useRouter();
  // R-HOME-4f: reserva a zona do FABMenu global para o ultimo campo do
  // formulario nao ficar atras do FAB.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
  const toast = useToast();
  const setNome = usePessoa((s) => s.setNome);
  const setTipoCompanhia = useOnboarding((s) => s.setTipoCompanhia);
  const [nomeB, setNomeB] = useState('');
  const [tipo, setTipo] = useState<'casal' | 'amigos' | null>(null);

  const salvar = () => {
    const b = nomeB.trim();
    if (tipo === null) {
      toast.show('Escolha se vocês são casal ou amigos.', 'warn');
      return;
    }
    if (b.length === 0) {
      toast.show('Digite o nome da segunda pessoa.', 'warn');
      return;
    }
    setNome('pessoa_b', b);
    // Espelha em useSettings por dentro do store; escrever direto lá
    // seria desfeito pela reconciliação do próximo boot.
    setTipoCompanhia(tipo);
    toast.show('Pessoa B adicionada.', 'success');
    router.back();
  };

  return (
    <Screen>
      <Header title="Adicionar segunda pessoa" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: paddingBottomFab,
          gap: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
            paddingHorizontal: spacing.xs,
          }}
        >
          O Vault será compartilhado por padrão. Você pode mudar isso depois nas
          configurações.
        </Text>

        <View style={{ gap: spacing.md }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.body.size,
              lineHeight: typography.body.size * typography.body.lineHeight,
              paddingHorizontal: spacing.xs,
            }}
          >
            Vocês são…
          </Text>
          <ChipGroup
            mode="single"
            value={tipo}
            onChange={(next) => {
              if (next === 'casal' || next === 'amigos') setTipo(next);
            }}
            options={[
              { value: 'casal', label: 'Casal', accent: 'purple' },
              { value: 'amigos', label: 'Amigos', accent: 'cyan' },
            ]}
          />
        </View>

        <View style={{ gap: spacing.md, alignItems: 'center' }}>
          <Text
            style={{
              color: colors.orange,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.caption.size,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Pessoa B
          </Text>
          <AvatarPicker pessoa="pessoa_b" size={96} />
          <View style={{ width: '100%' }}>
            <Input
              value={nomeB}
              onChangeText={setNomeB}
              label="Nome"
              placeholder="Como ela é chamada?"
              accessibilityLabel="nome pessoa b"
            />
          </View>
        </View>

        <Button label="Salvar" variant="primary" onPress={salvar} />
      </ScrollView>
    </Screen>
  );
}
