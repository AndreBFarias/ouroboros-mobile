// Sub-tela: adicionar pessoa B quando tipoCompanhia atual e 'sozinho'.
// Replica o Frame 1 do onboarding (M03): AvatarPicker + Input do nome.
// Ao salvar, atualiza setPessoa('tipoCompanhia', 'duo') e setNome de
// pessoa B. Avisa o usuario que a pessoa A continua a mesma.
//
// Decisão M15: o link aparece em /(tabs)/settings/index apenas se
// tipoCompanhia === 'sozinho'. Após salvar aqui, vira 'duo' e o link
// some automaticamente da Tela 23.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AvatarPicker,
  Button,
  Header,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';
import { colors, spacing, typography } from '@/theme/tokens';

export default function AdicionarSegundaPessoa() {
  const router = useRouter();
  const toast = useToast();
  const setNome = usePessoa((s) => s.setNome);
  const setPessoa = useSettings((s) => s.setPessoa);
  const [nomeB, setNomeB] = useState('');

  const salvar = () => {
    const b = nomeB.trim();
    if (b.length === 0) {
      toast.show('Digite o nome da segunda pessoa.', 'warn');
      return;
    }
    setNome('pessoa_b', b);
    setPessoa('tipoCompanhia', 'duo');
    toast.show('Pessoa B adicionada.', 'success');
    router.back();
  };

  return (
    <Screen>
      <Header
        title="Adicionar segunda pessoa"
        onBack={() => router.back()}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: 120,
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
          O Vault será compartilhado por padrão. Você pode mudar isso
          depois nas configurações.
        </Text>

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
