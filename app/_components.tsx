// Storybook caseiro M01. Renderiza todos os componentes base em
// isolamento, em ordem de leitura natural. Acessivel pela rota
// /_components do Expo Router. Sem dependencia em fixtures externas.
import { ReactNode, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: 28, gap: 12 }}>
      <Text className="font-mono text-orange text-xs lowercase">{title}</Text>
      {children}
    </View>
  );
}

const HUMOR_OPCOES: ChipOption[] = [
  { value: 'serenidade', label: 'serenidade', accent: 'cyan' },
  { value: 'ansiedade', label: 'ansiedade', accent: 'yellow' },
  { value: 'irritacao', label: 'irritacao', accent: 'red' },
  { value: 'cansaco', label: 'cansaco', accent: 'orange' },
];

const TAGS_OPCOES: ChipOption[] = [
  { value: 'casa', label: 'casa' },
  { value: 'trabalho', label: 'trabalho' },
  { value: 'lazer', label: 'lazer' },
];

export default function ComponentsStory() {
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

  return (
    <Screen>
      <Header title="storybook m01" />

      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="botoes">
          <Button label="primary action" onPress={() => undefined} />
          <Button
            label="success"
            onPress={() => undefined}
            variant="success"
          />
          <Button label="ghost" onPress={() => undefined} variant="ghost" />
          <Button
            label="destructive"
            onPress={() => undefined}
            variant="destructive"
          />
          <Button label="disabled" onPress={() => undefined} disabled />
        </Section>

        <Section title="cards">
          <Card>
            <Text className="font-mono text-fg text-base">
              card padrao em repouso.
            </Text>
            <Text className="font-mono text-muted text-xs mt-2">
              fundo bg-alt, radius 12, padding 16.
            </Text>
          </Card>
          <Card variant="active" onPress={() => undefined}>
            <Text className="font-mono text-fg text-base">
              card ativo com tap.
            </Text>
            <Text className="font-mono text-muted text-xs mt-2">
              borda purple. scale 0.99 ao pressionar.
            </Text>
          </Card>
        </Section>

        <Section title="inputs">
          <Input
            label="anotacao"
            value={texto}
            onChangeText={setTexto}
            placeholder="escreva aqui."
          />
          <Textarea
            label="diario"
            value={longo}
            onChangeText={setLongo}
            placeholder="o que voce sentiu hoje."
          />
        </Section>

        <Section title="chips single">
          <ChipGroup
            mode="single"
            options={HUMOR_OPCOES}
            value={humor}
            onChange={setHumor}
          />
        </Section>

        <Section title="chips multi">
          <ChipGroup
            mode="multi"
            options={TAGS_OPCOES}
            value={tags}
            onChange={setTags}
          />
          <Chip
            label="chip avulso"
            selected={false}
            onPress={() => undefined}
            accent="pink"
          />
        </Section>

        <Section title="toggle">
          <View
            className="flex-row items-center justify-between"
            style={{ paddingVertical: 4 }}
          >
            <Text className="font-mono text-fg text-sm">modo silencioso</Text>
            <Toggle value={silencioso} onChange={setSilencioso} />
          </View>
          <View
            className="flex-row items-center justify-between"
            style={{ paddingVertical: 4 }}
          >
            <Text className="font-mono text-fg text-sm">notificacoes</Text>
            <Toggle value={notif} onChange={setNotif} />
          </View>
        </Section>

        <Section title="avatares">
          <View className="flex-row" style={{ gap: 12 }}>
            <PersonAvatar pessoa="pessoa_a" size="sm" />
            <PersonAvatar pessoa="pessoa_a" size="md" />
            <PersonAvatar pessoa="pessoa_a" size="lg" />
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <PersonAvatar pessoa="pessoa_b" size="sm" />
            <PersonAvatar pessoa="pessoa_b" size="md" />
            <PersonAvatar pessoa="pessoa_b" size="lg" />
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <PersonAvatar
              pessoa="ambos"
              size="md"
              onPress={() => undefined}
            />
          </View>
        </Section>

        <Section title="empty state">
          <Card>
            <EmptyState
              frase="nada anotado por enquanto."
              Icon={Heart}
            />
          </Card>
        </Section>

        <Section title="slider">
          <Slider
            label="intensidade"
            min={1}
            max={5}
            step={1}
            value={intensidade}
            onChange={setIntensidade}
          />
        </Section>

        <Section title="toast">
          <Button
            label="toast sucesso"
            onPress={() => toast.show('feito.', 'success')}
            variant="success"
          />
          <Button
            label="toast erro"
            onPress={() => toast.show('falhou.', 'error')}
            variant="destructive"
          />
          <Button
            label="toast info"
            onPress={() => toast.show('anotado.', 'info')}
            variant="ghost"
          />
        </Section>

        <Section title="bottom sheet">
          <Button
            label="abrir sheet"
            onPress={() => sheetRef.current?.expand()}
          />
        </Section>

        <Section title="fab e fab radial">
          <Text className="font-mono text-muted text-xs">
            ultima acao radial: {ultimaAcao ?? '—'}
          </Text>
          <Button
            label={radialOpen ? 'fechar radial' : 'abrir radial'}
            onPress={() => setRadialOpen((v) => !v)}
            variant="ghost"
          />
        </Section>
      </ScrollView>

      <BottomSheet ref={sheetRef} snapPoints={['40%', '85%']}>
        <View style={{ padding: 20, gap: 12 }}>
          <Text className="font-mono text-fg text-base">
            sheet aberto. arraste para baixo para fechar.
          </Text>
          <Text className="font-mono text-muted text-xs">
            background bg-alt, handle bg-elev. backdrop fade 0.5.
          </Text>
        </View>
      </BottomSheet>

      {/* FAB simples nao convive bem com FABRadial no mesmo canto:
          quando radial estiver fechado, mostramos FAB; quando aberto,
          o FABRadial ja desenha seu proprio FAB rotativo. */}
      {!radialOpen && (
        <FAB
          onPress={() => toast.show('fab pressionado.', 'info')}
          accessibilityLabel="acao rapida demo"
        />
      )}

      <FABRadial
        open={radialOpen}
        onOpenChange={setRadialOpen}
        onSelect={(key) => {
          setUltimaAcao(key);
          toast.show(`acao: ${key}.`, 'info');
        }}
      />
    </Screen>
  );
}
