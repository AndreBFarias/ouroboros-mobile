// Tela "Sobre" detalhada acessivel via Settings -> Sobre. Reusa o
// componente <SecaoSobre> (versao/build/hash/repo/licenca) e adiciona
// o mini-changelog amigavel lido de RELEASE_NOTES (TS estruturado, nao
// import bruto do CHANGELOG.md). Texto em sentence case PT-BR
// completa. Sem analytics, sem opt-out (ADR-0007).
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { SecaoSobre } from '@/components/settings/SecaoSobre';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { RELEASE_NOTES } from '@/lib/release/changelog';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SobreTela() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Sobre" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SecaoSobre />
        <SecaoMiniChangelog />
        <SecaoCreditos />
      </ScrollView>
    </Screen>
  );
}

function SecaoMiniChangelog() {
  return (
    <SecaoLista titulo="O que mudou" accessibilityLabel="secao o que mudou">
      {RELEASE_NOTES.map((nota) => (
        <BlocoVersao key={nota.versao} nota={nota} />
      ))}
    </SecaoLista>
  );
}

interface BlocoVersaoProps {
  nota: {
    versao: string;
    data: string;
    mudancas: readonly string[];
  };
}

function BlocoVersao({ nota }: BlocoVersaoProps) {
  return (
    <View
      accessibilityLabel={`versao ${nota.versao}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.purple,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
          }}
        >
          v{nota.versao}
        </Text>
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
          }}
        >
          {nota.data}
        </Text>
      </View>
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        {nota.mudancas.map((m, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.body.size,
                lineHeight: typography.body.size * typography.body.lineHeight,
              }}
            >
              •
            </Text>
            <Text
              style={{
                flex: 1,
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.body.size,
                lineHeight: typography.body.size * typography.body.lineHeight,
              }}
            >
              {m}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SecaoCreditos() {
  return (
    <SecaoLista titulo="Créditos" accessibilityLabel="secao creditos">
      <View
        accessibilityLabel="texto creditos"
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.base,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
          }}
        >
          Projeto comunitário de código aberto. Construído com Expo,
          React Native e ferramentas livres. Distribuído sem
          telemetria, sem coleta de dados e sem dependência de
          serviços remotos.
        </Text>
      </View>
    </SecaoLista>
  );
}
