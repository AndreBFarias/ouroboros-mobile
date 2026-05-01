// Sub-tela: edicao de nomes e fotos das pessoas. Reusa <AvatarPicker>
// e <Input> do M03. Salva via usePessoa.setNome (foto e tratada
// dentro do AvatarPicker que ja persiste em fotos[pessoa]).
// Mostra pessoa B somente quando tipoCompanhia === 'duo'.
import { useState, useEffect } from 'react';
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

export default function EditarPessoa() {
  const router = useRouter();
  const toast = useToast();
  const nomes = usePessoa((s) => s.nomes);
  const setNome = usePessoa((s) => s.setNome);
  const tipoCompanhia = useSettings((s) => s.pessoa.tipoCompanhia);
  const ehDuo = tipoCompanhia === 'duo';

  const [nomeA, setNomeA] = useState(nomes.pessoa_a);
  const [nomeB, setNomeB] = useState(nomes.pessoa_b);

  // Sincroniza estado local quando o store hidrata depois.
  useEffect(() => {
    setNomeA(nomes.pessoa_a);
    setNomeB(nomes.pessoa_b);
  }, [nomes.pessoa_a, nomes.pessoa_b]);

  const salvar = () => {
    const a = nomeA.trim();
    if (a.length === 0) {
      toast.show('Nome da pessoa A não pode ficar vazio.', 'warn');
      return;
    }
    setNome('pessoa_a', a);
    if (ehDuo) {
      const b = nomeB.trim();
      if (b.length === 0) {
        toast.show('Nome da pessoa B não pode ficar vazio.', 'warn');
        return;
      }
      setNome('pessoa_b', b);
    }
    toast.show('Salvo.', 'success');
    router.back();
  };

  return (
    <Screen>
      <Header
        title="Editar nomes e fotos"
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
        <BlocoPessoa
          titulo="Pessoa A"
          pessoa="pessoa_a"
          nome={nomeA}
          onChangeNome={setNomeA}
        />
        {ehDuo ? (
          <BlocoPessoa
            titulo="Pessoa B"
            pessoa="pessoa_b"
            nome={nomeB}
            onChangeNome={setNomeB}
          />
        ) : (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
              lineHeight:
                typography.caption.size * typography.caption.lineHeight,
              textAlign: 'center',
              paddingHorizontal: spacing.lg,
            }}
          >
            Ative segunda pessoa nas configurações para editar pessoa B.
          </Text>
        )}

        <Button label="Salvar" variant="primary" onPress={salvar} />
      </ScrollView>
    </Screen>
  );
}

interface BlocoPessoaProps {
  titulo: string;
  pessoa: 'pessoa_a' | 'pessoa_b';
  nome: string;
  onChangeNome: (next: string) => void;
}

function BlocoPessoa({ titulo, pessoa, nome, onChangeNome }: BlocoPessoaProps) {
  return (
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
        {titulo}
      </Text>
      <AvatarPicker pessoa={pessoa} size={96} />
      <View style={{ width: '100%' }}>
        <Input
          value={nome}
          onChangeText={onChangeNome}
          label="Nome"
          placeholder={pessoa === 'pessoa_a' ? 'Nome A' : 'Nome B'}
          accessibilityLabel={`nome ${pessoa}`}
        />
      </View>
    </View>
  );
}
