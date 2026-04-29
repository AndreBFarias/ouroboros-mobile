// Storybook caseiro do M01.3. Renderiza todos os 9 componentes base
// em isolamento, em ordem de leitura natural. Acessivel pela rota
// /_components do Expo Router. Sem dependencia em fixtures externas.
import { ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  Header,
  Input,
  PersonAvatar,
  Screen,
  Textarea,
  Toggle,
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

  return (
    <Screen>
      <Header title="storybook m01.3" />

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
      </ScrollView>
    </Screen>
  );
}
