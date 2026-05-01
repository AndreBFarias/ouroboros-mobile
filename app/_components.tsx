// Storybook caseiro M01. Renderiza todos os componentes base em
// isolamento, em ordem de leitura natural. Acessivel pela rota
// /_components do Expo Router. Sem dependencia em fixtures externas.
// Strings visiveis em sentence case + acentuacao PT-BR; a11y sem acento.
import { ReactNode, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import {
  BottomSheet,
  type BottomSheetRef,
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  FAB,
  FABRadial,
  type FABRadialKey,
  Header,
  Input,
  PersonAvatar,
  Screen,
  Slider,
  Textarea,
  Toggle,
  useOptionalToast,
  type ChipOption,
} from '@/components/ui';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';

interface SectionProps {
  title: string;
  children: ReactNode;
}

// Espacamento generoso entre seções (40dp) e gap interno 14dp.
// Titulo da seção com paddingTop 8 e marginBottom 4 para respirar.
function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: 40, gap: 14 }}>
      <Text
        className="font-mono text-orange text-xs"
        style={{ paddingTop: 8, marginBottom: 4 }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const HUMOR_OPCOES: ChipOption[] = [
  { value: 'serenidade', label: 'Serenidade', accent: 'cyan' },
  { value: 'ansiedade', label: 'Ansiedade', accent: 'yellow' },
  { value: 'irritacao', label: 'Irritação', accent: 'red' },
  { value: 'cansaco', label: 'Cansaço', accent: 'orange' },
];

const TAGS_OPCOES: ChipOption[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'lazer', label: 'Lazer' },
];

export default function ComponentsStory() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [longo, setLongo] = useState('');
  const [humor, setHumor] = useState<string | null>('serenidade');
  const [tags, setTags] = useState<string[]>(['casa']);
  const [silencioso, setSilencioso] = useState(false);
  const [notif, setNotif] = useState(true);
  const [intensidade, setIntensidade] = useState(3);
  const [radialOpen, setRadialOpen] = useState(false);
  const [ultimaAcao, setUltimaAcao] = useState<FABRadialKey | null>(null);
  const sheetRef = useRef<BottomSheetRef>(null);
  const toast = useOptionalToast();

  const resetarOnboarding = () => {
    useOnboarding.getState().resetar();
    usePessoa.getState().resetar();
    useVault.getState().clearVaultRoot();
    toast?.show('Onboarding resetado. Voltando para o início.', 'info');
    // M00.5: Tela 01 agora mora em /(tabs)/index. O grupo de rotas
    // (tabs) e transparente para o usuario, mas o router.replace
    // precisa apontar explicitamente para a rota dentro do grupo.
    setTimeout(() => router.replace('/(tabs)'), 300);
  };

  return (
    <Screen>
      <Header title="Storybook M01" />

      <ScrollView
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Reset (dev)">
          <Button
            label="Resetar onboarding"
            variant="destructive"
            onPress={resetarOnboarding}
          />
          <Text
            className="font-mono text-muted text-xs"
            style={{ lineHeight: 18 }}
          >
            Limpa nome, foto, vault e flag de onboarding. O app
            redireciona para o fluxo de boas-vindas. Usado em
            desenvolvimento.
          </Text>
        </Section>

        <Section title="Botões">
          <Button label="Ação primária" onPress={() => undefined} />
          <Button
            label="Sucesso"
            onPress={() => undefined}
            variant="success"
          />
          <Button label="Ghost" onPress={() => undefined} variant="ghost" />
          <Button
            label="Destrutivo"
            onPress={() => undefined}
            variant="destructive"
          />
          <Button label="Desabilitado" onPress={() => undefined} disabled />
        </Section>

        <Section title="Cards">
          <Card>
            <Text
              className="font-mono text-fg text-base"
              style={{ lineHeight: 22 }}
            >
              Card padrão em repouso.
            </Text>
            <Text
              className="font-mono text-muted text-xs mt-2"
              style={{ lineHeight: 18 }}
            >
              Fundo bg-alt, radius 12, padding 16.
            </Text>
          </Card>
          <Card variant="active" onPress={() => undefined}>
            <Text
              className="font-mono text-fg text-base"
              style={{ lineHeight: 22 }}
            >
              Card ativo com tap.
            </Text>
            <Text
              className="font-mono text-muted text-xs mt-2"
              style={{ lineHeight: 18 }}
            >
              Borda purple. Scale 0,99 ao pressionar.
            </Text>
          </Card>
        </Section>

        <Section title="Inputs">
          <Input
            label="Anotação"
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva aqui."
            accessibilityLabel="campo anotacao"
          />
          <Textarea
            label="Diário"
            value={longo}
            onChangeText={setLongo}
            placeholder="O que você sentiu hoje."
            accessibilityLabel="campo diario"
          />
        </Section>

        <Section title="Chips single-select">
          <ChipGroup
            mode="single"
            options={HUMOR_OPCOES}
            value={humor}
            onChange={setHumor}
          />
        </Section>

        <Section title="Chips multi-select">
          <ChipGroup
            mode="multi"
            options={TAGS_OPCOES}
            value={tags}
            onChange={setTags}
          />
          <Chip
            label="Chip avulso"
            selected={false}
            onPress={() => undefined}
            accent="pink"
          />
        </Section>

        <Section title="Toggle">
          <View
            className="flex-row items-center justify-between"
            style={{ paddingVertical: 6 }}
          >
            <Text className="font-mono text-fg text-sm">Modo silencioso</Text>
            <Toggle value={silencioso} onChange={setSilencioso} />
          </View>
          <View
            className="flex-row items-center justify-between"
            style={{ paddingVertical: 6 }}
          >
            <Text className="font-mono text-fg text-sm">Notificações</Text>
            <Toggle value={notif} onChange={setNotif} />
          </View>
        </Section>

        <Section title="Avatares">
          <View className="flex-row" style={{ gap: 14 }}>
            <PersonAvatar pessoa="pessoa_a" size="sm" />
            <PersonAvatar pessoa="pessoa_a" size="md" />
            <PersonAvatar pessoa="pessoa_a" size="lg" />
          </View>
          <View className="flex-row" style={{ gap: 14 }}>
            <PersonAvatar pessoa="pessoa_b" size="sm" />
            <PersonAvatar pessoa="pessoa_b" size="md" />
            <PersonAvatar pessoa="pessoa_b" size="lg" />
          </View>
          <View className="flex-row" style={{ gap: 14 }}>
            <PersonAvatar
              pessoa="ambos"
              size="md"
              onPress={() => undefined}
            />
          </View>
        </Section>

        <Section title="Empty state">
          <Card>
            <EmptyState
              frase="Nada anotado por enquanto."
              Icon={Heart}
            />
          </Card>
        </Section>

        <Section title="Slider">
          <Slider
            label="Intensidade"
            min={1}
            max={5}
            step={1}
            value={intensidade}
            onChange={setIntensidade}
          />
        </Section>

        <Section title="Toast">
          <Button
            label="Toast sucesso"
            onPress={() => toast.show('Feito.', 'success')}
            variant="success"
          />
          <Button
            label="Toast erro"
            onPress={() => toast.show('Falhou.', 'error')}
            variant="destructive"
          />
          <Button
            label="Toast info"
            onPress={() => toast.show('Anotado.', 'info')}
            variant="ghost"
          />
        </Section>

        <Section title="Bottom sheet">
          <Button
            label="Abrir sheet"
            onPress={() => sheetRef.current?.expand()}
          />
        </Section>

        <Section title="FAB e FAB radial">
          <Text
            className="font-mono text-muted text-xs"
            style={{ lineHeight: 18 }}
          >
            Última ação radial: {ultimaAcao ?? '—'}
          </Text>
          <Button
            label={radialOpen ? 'Fechar radial' : 'Abrir radial'}
            onPress={() => setRadialOpen((v) => !v)}
            variant="ghost"
          />
        </Section>
      </ScrollView>

      <BottomSheet ref={sheetRef} snapPoints={['40%', '85%']}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text
            className="font-mono text-fg text-base"
            style={{ lineHeight: 22 }}
          >
            Sheet aberto. Arraste para baixo para fechar.
          </Text>
          <Text
            className="font-mono text-muted text-xs"
            style={{ lineHeight: 18 }}
          >
            Background bg-alt, handle bg-elev. Backdrop fade 0,5.
          </Text>
        </View>
      </BottomSheet>

      {/* FAB simples não convive bem com FABRadial no mesmo canto:
          quando radial estiver fechado, mostramos FAB; quando aberto,
          o FABRadial já desenha seu proprio FAB rotativo. */}
      {!radialOpen && (
        <FAB
          onPress={() => toast.show('FAB pressionado.', 'info')}
          accessibilityLabel="acao rapida demo"
        />
      )}

      <FABRadial
        open={radialOpen}
        onOpenChange={setRadialOpen}
        onSelect={(key) => {
          setUltimaAcao(key);
          toast.show(`Ação: ${key}.`, 'info');
        }}
      />
    </Screen>
  );
}
